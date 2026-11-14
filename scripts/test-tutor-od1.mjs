// OD1 试听课验收
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9461;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let failures=0;const check=(n,ok,extra)=>{if(!ok)failures++;console.log(`${ok?'PASS':'FAIL'} · ${n}${extra?' :: '+extra:''}`)};

const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--remote-allow-origins=*',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=${path.join(os.tmpdir(),'ops-od1-'+Date.now())}`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break}catch{}await sleep(200)}
const tg=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(tg.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let seq=0;const pend=new Map();const ev=[];
ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{r,j}=pend.get(d.id);pend.delete(d.id);d.error?j(new Error(JSON.stringify(d.error))):r(d.result)}else if(d.method)ev.push(d)};
const send=(method,params={})=>new Promise((r,j)=>{const id=++seq;pend.set(id,{r,j});ws.send(JSON.stringify({id,method,params}))});
for(const m of ['Page.enable','Runtime.enable'])await send(m);
const evalJs=async(e)=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value};

await send('Page.navigate',{url:'http://127.0.0.1:917/tutor.html?book=od1&unit=1'});await sleep(1400);
await evalJs('window.alert=()=>{};true');
check('OD1 试听页加载', (await evalJs('document.title')).includes('AI 老师课堂'));
const startClass = async () => { await evalJs(`document.querySelector('#startBtn').click()`); await sleep(300); await evalJs(`(()=>{const b=document.querySelector('#humanBox');if(b){b.checked=true;b.dispatchEvent(new Event('change'));}return true})()`); await sleep(1600); };
await evalJs("localStorage.setItem('ops917-min-minutes','0');true");
await startClass();await sleep(4500);
const chat=await evalJs(`document.querySelector('#chat').innerText`);
check('老师说本单元内容', /family|Lesson|OD1|Families/i.test(chat + JSON.stringify(await evalJs(`window.__tutor.state`))), chat.slice(0,150));
check('老师交代本课目标', /Families and Friends|family|words|目标/i.test(chat), chat.slice(0,200));
check('老师用英文提问', /Introduce|family|answer|tell/i.test(chat), chat.slice(-120));
const st=await evalJs(`window.__tutor.state`);
check('本课练习量（Lesson 1 标准=11 项）', st.total===11, JSON.stringify(st));
check('任务含说/语法/拼写/写作', st.types.includes('speaking')&&st.types.includes('grammar')&&st.types.includes('dictation')&&st.types.includes('writing'), JSON.stringify(st.types));
check('有 Lesson 1–4 切换', (await evalJs(`document.querySelectorAll('#lessonNav a').length`))===4);
check('有练习量选择（少/标准/多）', (await evalJs(`!!document.querySelector('#paceSel')`))===true);
const tts=await evalJs(`(window.__ttsCalls||0)`);
check('开场只朗读一段（不是全部对话框）', tts===1, 'tts='+tts);

// 切到 Lesson 3 语法课
await send('Page.navigate',{url:'http://127.0.0.1:917/tutor.html?book=od1&unit=1&lesson=3'});await sleep(1400);
await evalJs('window.alert=()=>{};true');
await startClass();await sleep(4500);
const st3=await evalJs(`window.__tutor.state`);
check('Lesson 3 是语法专项（12 项）', st3.total===12 && st3.types.filter(t=>t==='grammar').length>=8, JSON.stringify(st3));
const chat3=await evalJs(`document.querySelector('#chat').innerText`);
check('Lesson 3 用英文问语法题', /___|am|is|are|family|answer/i.test(chat3), chat3.slice(-100));
await evalJs(`(()=>{const i=document.querySelector('#answer');i.value='This is my mother. This is my father.';i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#sendBtn').click();return true})()`);
await sleep(4000);
const chat2=await evalJs(`document.querySelector('#chat').innerText`);
check('老师有反馈并推进', chat2.length>chat.length, 'len '+chat.length+' -> '+chat2.length);
const exc=ev.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails?.exception?.description||e.params.exceptionDetails?.text).filter(x=>!/favicon/.test(x||''));
check('无 JS 异常', exc.length===0, exc.slice(0,1).join(''));
chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode=failures?1:0;
