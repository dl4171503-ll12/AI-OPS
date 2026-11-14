// 按单元连续进度：Unit1 Lesson4 小测通过 → 自动进入 Unit2 Lesson1；Unit2 无手写教案时自动生成练习
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9531;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let failures=0;const check=(n,ok,extra)=>{if(!ok)failures++;console.log(`${ok?'PASS':'FAIL'} · ${n}${extra?' :: '+extra:''}`)};

const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--remote-allow-origins=*',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=${path.join(os.tmpdir(),'ops-plan-'+Date.now())}`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break}catch{}await sleep(200)}
const tg=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(tg.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let seq=0;const pend=new Map();
ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{r,j}=pend.get(d.id);pend.delete(d.id);d.error?j(new Error(JSON.stringify(d.error))):r(d.result)}};
const send=(method,params={})=>new Promise((r,j)=>{const id=++seq;pend.set(id,{r,j});ws.send(JSON.stringify({id,method,params}))});
for(const m of ['Page.enable','Runtime.enable'])await send(m);
const evalJs=async(e)=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value};
const nav=async(u)=>{await send('Page.navigate',{url:u});await sleep(1400);await evalJs('window.alert=()=>{};true')};
const start=async()=>{await evalJs('window.localStorage.setItem("ops917-min-minutes","0");true');await evalJs(`document.querySelector('#startBtn').click()`);await sleep(300);await evalJs(`(()=>{const b=document.querySelector('#humanBox');if(b){b.checked=true;b.dispatchEvent(new Event('change'));}return true})()`);await sleep(2500)};
const answer=async(t)=>{await evalJs(`(()=>{const i=document.querySelector('#answer');i.value=${JSON.stringify(t)};i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#sendBtn').click();return true})()`);await sleep(2000)};

// 1. Unit1 Lesson4 小测通过 → 进入 Unit2 Lesson1
await nav('http://127.0.0.1:917/tutor.html?book=od1&unit=1&lesson=4');
await evalJs(`localStorage.removeItem('ops917-lesson-history:v1');localStorage.removeItem('ops917-task-mastery:v1');localStorage.removeItem('ops917-lesson-completed:v1');true`);
await nav('http://127.0.0.1:917/tutor.html?book=od1&unit=1&lesson=4');
await start();
await evalJs('window.__startQuizForTest()');await sleep(1200);
const qs=await evalJs('window.__quizQuestions()');
for(const q of qs){ await answer(q.answer || 'x'); }
await sleep(5500);
const url1=await evalJs('location.search');
check('Unit1 完成后进入 Unit2 Lesson1', /unit=2&lesson=1/.test(url1), url1);

// 2. Unit2 没有单独教案时自动生成练习，且能进入课堂
const title=await evalJs('document.title');
check('Unit2 课堂可加载', /AI 老师课堂/.test(title));
await start();
const st=await evalJs('window.__tutor.state');
check('Unit2 自动生成练习', st && st.total>=4, JSON.stringify(st));
check('Unit2 课堂状态可用', (await evalJs(`window.__supervisorState ? true : false`))===true);
const chat=await evalJs(`document.querySelector('#chat').innerText`);
check('Unit2 老师已开始上课', chat.length>80, chat.slice(-100));

chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode=failures?1:0;
