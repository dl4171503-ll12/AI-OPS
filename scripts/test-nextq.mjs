// 验证老师每轮拿到"下一题"：连续答 3 题，nextQuestion 应依次变化
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9481;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let failures=0;const check=(n,ok,extra)=>{if(!ok)failures++;console.log(`${ok?'PASS':'FAIL'} · ${n}${extra?' :: '+extra:''}`)};

const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--remote-allow-origins=*',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=${path.join(os.tmpdir(),'ops-nextq-'+Date.now())}`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break}catch{}await sleep(200)}
const tg=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(tg.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let seq=0;const pend=new Map();
ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{r,j}=pend.get(d.id);pend.delete(d.id);d.error?j(new Error(JSON.stringify(d.error))):r(d.result)}};
const send=(method,params={})=>new Promise((r,j)=>{const id=++seq;pend.set(id,{r,j});ws.send(JSON.stringify({id,method,params}))});
for(const m of ['Page.enable','Runtime.enable'])await send(m);
const evalJs=async(e)=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value};
const answer=async(t)=>{await evalJs(`(()=>{const i=document.querySelector('#answer');i.value=${JSON.stringify(t)};i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#sendBtn').click();return true})()`);await sleep(3800)};

await send('Page.navigate',{url:'http://127.0.0.1:917/tutor.html?book=od1&unit=1&lesson=1'});await sleep(1400);
await evalJs('window.alert=()=>{};true');
const startClass = async () => { await evalJs(`document.querySelector('#startBtn').click()`); await sleep(300); await evalJs(`(()=>{const b=document.querySelector('#humanBox');if(b){b.checked=true;b.dispatchEvent(new Event('change'));}return true})()`); await sleep(1600); };
await evalJs("localStorage.setItem('ops917-min-minutes','0');true");
await startClass();await sleep(4000);
const nexts=[];
for(const t of ['My family is big.','mother','father']){
  await answer(t);
  nexts.push(await evalJs(`(window.__lastTutorBody&&window.__lastTutorBody.nextQuestion)||''`));
}
console.log('nextQuestions:', JSON.stringify(nexts.map(s=>s.slice(0,70))));
check('每轮都有下一题', nexts.every(s=>s.length>0), JSON.stringify(nexts.map(s=>s.length)));
check('下一题在变化（不重复）', new Set(nexts.filter(Boolean)).size===nexts.filter(Boolean).length, JSON.stringify(nexts.map(s=>s.slice(0,30))));
check('第 1 轮下一题是词汇题', /woman|mother|father/i.test(nexts[0]), nexts[0].slice(0,80));
check('第 3 轮已到 grandmother', /grandmother/i.test(nexts[2]||''), (nexts[2]||'').slice(0,80));

chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode=failures?1:0;
