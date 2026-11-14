// 阶段小测 + 错题讲解/订正 + 掌握后自动进入下一课
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9521;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let failures=0;const check=(n,ok,extra)=>{if(!ok)failures++;console.log(`${ok?'PASS':'FAIL'} · ${n}${extra?' :: '+extra:''}`)};

const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--remote-allow-origins=*',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=${path.join(os.tmpdir(),'ops-quiz-'+Date.now())}`,'about:blank'],{stdio:'ignore'});
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
const answer=async(t)=>{await evalJs(`(()=>{const i=document.querySelector('#answer');i.value=${JSON.stringify(t)};i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#sendBtn').click();return true})()`);await sleep(2200)};

const URL='http://127.0.0.1:917/tutor.html?book=od1&unit=1&lesson=1';
// 1. 小测全对 → 自动进入下一课
await nav(URL);await start();
await evalJs('window.__startQuizForTest()');await sleep(1200);
let qs=await evalJs('window.__quizQuestions()');
check('阶段小测出 3 题', qs.length===3, JSON.stringify(qs.map(q=>q.type)));
for(const q of qs){ await answer(q.answer || 'x'); }
await sleep(1500);
const st=await evalJs('window.__quizState()');
check('小测全对通过', st.quizScore>=0.8 && st.passed===true, JSON.stringify(st));
await sleep(4500);
const url1=await evalJs('location.search');
check('掌握后自动进入下一课', /lesson=2/.test(url1), url1);

// 2. 小测全错 → 错题讲解 + 订正，订正后通过并进入下一课
await nav(URL);
await evalJs(`localStorage.removeItem('ops917-lesson-history:v1');localStorage.removeItem('ops917-task-mastery:v1');true`);
await nav(URL);await start();
await evalJs('window.__startQuizForTest()');await sleep(1200);
qs=await evalJs('window.__quizQuestions()');
for(const q of qs){ await answer('zzz'); }
await sleep(1800);
const st2=await evalJs('window.__quizState()');
check('小测全错进入错题订正', st2.phase==='remediation' && st2.passed===false, JSON.stringify(st2));
const chat=await evalJs(`document.querySelector('#chat').innerText`);
check('老师讲解错题', /mistake|review|answer|try/i.test(chat.slice(-400)), chat.slice(-150));
// 订正：重新取订正题答案（同原题）
qs=await evalJs('window.__quizQuestions()');
for(const q of qs){ await answer(q.answer || 'x'); }
await sleep(1800);
const st3=await evalJs('window.__quizState()');
check('订正正确后通过', st3.passed===true, JSON.stringify(st3));
await sleep(4500);
const url2=await evalJs('location.search');
check('订正通过后自动进入下一课', /lesson=2/.test(url2), url2);

chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode=failures?1:0;
