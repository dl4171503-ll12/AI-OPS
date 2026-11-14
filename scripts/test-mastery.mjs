// 掌握度跳过：学会的内容不再重复；整节掌握后自动进入下一节
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9511;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let failures=0;const check=(n,ok,extra)=>{if(!ok)failures++;console.log(`${ok?'PASS':'FAIL'} · ${n}${extra?' :: '+extra:''}`)};

const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--remote-allow-origins=*',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=${path.join(os.tmpdir(),'ops-mastery-'+Date.now())}`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break}catch{}await sleep(200)}
const tg=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(tg.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let seq=0;const pend=new Map();
ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{r,j}=pend.get(d.id);pendingDelete(d.id);d.error?j(new Error(JSON.stringify(d.error))):r(d.result)}};
function pendingDelete(id){pend.delete(id)}
const send=(method,params={})=>new Promise((r,j)=>{const id=++seq;pend.set(id,{r,j});ws.send(JSON.stringify({id,method,params}))});
for(const m of ['Page.enable','Runtime.enable'])await send(m);
const evalJs=async(e)=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value};
const nav=async(u)=>{await send('Page.navigate',{url:u});await sleep(1400);await evalJs('window.alert=()=>{};true')};
const start=async()=>{await evalJs('window.localStorage.setItem("ops917-min-minutes","0");true');await evalJs(`document.querySelector('#startBtn').click()`);await sleep(300);await evalJs(`(()=>{const b=document.querySelector('#humanBox');if(b){b.checked=true;b.dispatchEvent(new Event('change'));}return true})()`);await sleep(2500)};

// 1. 任务全掌握 → 开始后跳到下一节
await nav('http://127.0.0.1:917/tutor.html?book=od1&unit=1&lesson=1');
await start();
await evalJs(`window.__masteryMarkAll()`);
await nav('http://127.0.0.1:917/tutor.html?book=od1&unit=1&lesson=1');
await start();
await sleep(2200);
const url1=await evalJs('location.search');
check('整节题目全掌握后自动跳下一节', /lesson=2/.test(url1), url1);

// 2. 整节完成两次且高分 → 直接跳过本节
await nav('http://127.0.0.1:917/tutor.html?book=od1&unit=1&lesson=1');
await evalJs(`localStorage.setItem('ops917-lesson-history:v1', JSON.stringify([{key:'od1:1:1',pct:90,at:'x'},{key:'od1:1:1',pct:92,at:'y'}]));true`);
await nav('http://127.0.0.1:917/tutor.html?book=od1&unit=1&lesson=1');
await start();
await sleep(2500);
const url2=await evalJs('location.search');
check('反复学会的整节直接跳到未学部分', /lesson=2/.test(url2), url2);

// 3. 没掌握时不跳（普通会话仍从 Lesson 1 开始）
await nav('http://127.0.0.1:917/tutor.html?book=od1&unit=1&lesson=1');
await evalJs(`localStorage.removeItem('ops917-lesson-history:v1');localStorage.removeItem('ops917-task-mastery:v1');true`);
await nav('http://127.0.0.1:917/tutor.html?book=od1&unit=1&lesson=1');
await start();
const url3=await evalJs('location.search');
check('没掌握时正常学习本节', /lesson=1/.test(url3), url3);
const sv=await evalJs(`window.__supervisorState()`);
check('课堂仍在运行（有监督状态）', !!sv);

chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode=failures?1:0;
