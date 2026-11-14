// 监督 Agent：人机验证、反作弊、自适应敲打、本地存档
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9501;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let failures=0;const check=(n,ok,extra)=>{if(!ok)failures++;console.log(`${ok?'PASS':'FAIL'} · ${n}${extra?' :: '+extra:''}`)};

const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--remote-allow-origins=*',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=${path.join(os.tmpdir(),'ops-sup-'+Date.now())}`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break}catch{}await sleep(200)}
const tg=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(tg.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let seq=0;const pend=new Map();const ev=[];
ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{r,j}=pend.get(d.id);pend.delete(d.id);d.error?j(new Error(JSON.stringify(d.error))):r(d.result)}else if(d.method)ev.push(d)};
const send=(method,params={})=>new Promise((r,j)=>{const id=++seq;pend.set(id,{r,j});ws.send(JSON.stringify({id,method,params}))});
for(const m of ['Page.enable','Runtime.enable'])await send(m);
const evalJs=async(e)=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value};
const nav=async(u)=>{await send('Page.navigate',{url:u});await sleep(1400);await evalJs('window.alert=()=>{};true')};

const URL='http://127.0.0.1:917/tutor.html?book=od1&unit=1&lesson=1';
await nav(URL);
// 1. 课前人机验证
await evalJs("localStorage.setItem('ops917-min-minutes','0');true");
await evalJs(`document.querySelector('#startBtn').click()`);await sleep(500);
check('开始上课先出现人机验证', (await evalJs(`document.querySelector('#humanGate').style.display`))==='flex');
check('验证外观是浏览器式卡片', /Verify you are human/.test(await evalJs(`document.querySelector('#humanGate').innerText`)));
await evalJs(`(()=>{const b=document.querySelector('#humanBox');b.checked=true;b.dispatchEvent(new Event('change'));return true})()`);
await sleep(5000);
check('勾选后进入课堂', (await evalJs(`document.querySelector('#humanGate').style.display`))==='none' && (await evalJs(`document.querySelectorAll('#chat .msg').length`))>=2, 'msgs=' + await evalJs(`document.querySelectorAll('#chat .msg').length`));
const sup1=await evalJs(`window.__supervisorEvents()`);
check('人机验证写入监督日志', (sup1.events||[]).some(e=>e.type==='human-verified'));

// 2. 长粘贴被拦截并记录
const pasteRes=await evalJs(`(()=>{
  const i=document.querySelector('#answer');
  const dt=new DataTransfer(); dt.setData('text/plain','This is an AI generated answer that should not be pasted into the box.');
  const e=new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true});
  i.value=''; const notPrevented=i.dispatchEvent(e);
  return {value:i.value, prevented:!notPrevented};
})()`);
check('长粘贴被拦截（防 AI 代写）', pasteRes.prevented===true && pasteRes.value==='', JSON.stringify(pasteRes));
const sup2=await evalJs(`window.__supervisorEvents()`);
check('粘贴行为写入监督日志', (sup2.events||[]).some(e=>e.type==='paste'));

// 3. 整段插入检测（不拦输入法）
await evalJs(`(()=>{const i=document.querySelector('#answer'); i.value='a'.repeat(30); i.dispatchEvent(new Event('input')); return true})()`);
await sleep(80);
await evalJs(`(()=>{const i=document.querySelector('#answer'); i.value='a'.repeat(60); i.dispatchEvent(new Event('input')); return true})()`);
const sup3=await evalJs(`window.__supervisorEvents()`);
check('整段插入被记录', (sup3.events||[]).some(e=>e.type==='bulk-insert'));

// 4. 自适应敲打：上次 90 分 → 本次 0 分，应要求老师降难度
const expBefore=await evalJs(`document.querySelector('#exportSupBtn').disabled`);
const grayBefore=await evalJs(`getComputedStyle(document.querySelector('#exportSupBtn')).backgroundColor`);
check('完课前导出按钮是灰色', expBefore===true && /229, 231, 235/.test(grayBefore), grayBefore);
check('完课前点导出会被拦截', (await evalJs(`window.__exportSupervision(), window.__exportBlocked`))===true);
check('学生没有结束课程按钮', (await evalJs(`(()=>{const b=document.querySelector('#endBtn');return !b || getComputedStyle(b).display==='none'})()`))===true);
await evalJs(`localStorage.setItem('ops917-mastery:v1', JSON.stringify({lessons:{'1-1':{pct:90}},words:{}})); true`);
await evalJs(`window.__forceFinish()`);await sleep(1200);
const expAfter=await evalJs(`document.querySelector('#exportSupBtn').disabled`);
check('学完后才能导出监督记录', expAfter===false);
const ad=await evalJs(`JSON.parse(localStorage.getItem('ops917-adaptation:v1')||'null')`);
check('退步时生成"敲打老师"指令', ad && ad.last && ad.last.action==='lower', JSON.stringify(ad && ad.last));
const fb=await evalJs(`JSON.parse(localStorage.getItem('ops917-supervisor-feedback:v1')||'[]')`);
check('敲打反馈写入本地存档', Array.isArray(fb) && fb.length>=1, 'len=' + (fb&&fb.length));
const sup4=await evalJs(`window.__supervisorEvents()`);
check('敲打事件写入监督日志', (sup4.events||[]).some(e=>e.type==='knock-teacher'));
check('提供导出监督记录', (await evalJs(`typeof window.__exportSupervision`))==='function');
// 监督 Agent 接口：内容没学完不能 end
const r1=await fetch('http://127.0.0.1:917/api/school-supervise',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:{idx:1,total:11,elapsedSec:60,minSec:900,correct:1,flags:'',lesson:'OD1 U1 Lesson 1'}})});
const d1=await r1.json();
check('监督接口：没学完禁止结束', r1.status===200 && d1.ok && d1.decision!=='end', JSON.stringify(d1).slice(0,100));
const r2=await fetch('http://127.0.0.1:917/api/school-supervise',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:{idx:11,total:11,elapsedSec:1200,minSec:900,correct:10,flags:'',lesson:'OD1 U1 Lesson 1'}})});
const d2=await r2.json();
check('监督接口：学完且到时长可结束', r2.status===200 && d2.ok && d2.decision==='end', JSON.stringify(d2).slice(0,100));

const exc=ev.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails?.exception?.description||e.params.exceptionDetails?.text).filter(x=>!/favicon/.test(x||''));
check('无 JS 异常', exc.length===0, exc.slice(0,1).join(''));
chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode=failures?1:0;
