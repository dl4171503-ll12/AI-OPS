// 口语录音/朗读验证（临时副本 file://，不访问 918 页面）
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9391;
const tmp=path.join(os.tmpdir(),'ops-speak-'+Date.now());
fs.mkdirSync(tmp,{recursive:true});
const page=path.join(tmp,'a.html');
fs.copyFileSync(path.resolve('public/english-assessment.html'),page);
const URL_='file:///'+page.replace(/\\/g,'/');
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let failures=0;const check=(n,ok,extra)=>{if(!ok)failures++;console.log(`${ok?'PASS':'FAIL'} · ${n}${extra?' :: '+extra:''}`)};

const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-allow-origins=*',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=${path.join(tmp,'p')}`,'about:blank'],{stdio:'ignore'});
async function waitChrome(){for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)return}catch{}await sleep(200)}throw new Error('no chrome')}
let send;
async function connect(u){const ws=new WebSocket(u);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
  let seq=0;const pend=new Map();
  ws.onmessage=(m)=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{r,j}=pend.get(d.id);pend.delete(d.id);d.error?j(new Error(JSON.stringify(d.error))):r(d.result)}};
  send=(method,params={})=>new Promise((r,j)=>{const id=++seq;pend.set(id,{r,j});ws.send(JSON.stringify({id,method,params}))})}
const evalJs=async(e)=>{const p=send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});
  const t=new Promise((_,j)=>setTimeout(()=>j(new Error('eval timeout')),15000));
  const r=await Promise.race([p,t]);if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result?.value};

await waitChrome();
const tg=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
await connect(tg.webSocketDebuggerUrl);
for(const m of ['Page.enable','Runtime.enable']) await send(m);
await send('Page.navigate',{url:URL_}); await sleep(1400);

// 直接进入口语段，定位到朗读题
await evalJs(`(()=>{const E=window.__exam;E.reset();E.level={id:'beginner',label:'初级',grade:'小学 1–3 年级',lex:300};E.admin=[{id:'beginner-r1',lex:300,correct:2,total:4,pct:0.5}];E.lex=300;E.startSpeaking();E.speakIdx=E.speakTasks.length-1;E.renderSpeaking();return true})()`);
await sleep(400);
const info=await evalJs(`(()=>{const t=window.__exam.speakTasks[window.__exam.speakTasks.length-1];
  return {readAloud:!!t.readAloud,words:t.passage.trim().split(/\\s+/).length,text:t.passage};})()`);
check('朗读题存在',info.readAloud===true);
check('1–3 年级朗读文章 ≤35 词',info.words<=35,'words='+info.words);
check('朗读文本是完整句子',/[.!?]$/.test(info.text.trim()),info.text.slice(-40));
check('有多次录音容器',(await evalJs(`!!document.querySelector('#takesBox')`))===true);
check('初始无录音提示',/还没有录音/.test(await evalJs(`document.querySelector('#takesBox').innerText`)));
check('有录音按钮',(await evalJs(`!!document.querySelector('#recBtn')`))===true);

// 模拟已录 2 次（实际录音需要麦克风，这里只验证 UI）
await evalJs(`(()=>{const t=window.__exam.speakTasks[window.__exam.speakTasks.length-1];
  window.__exam.takes=window.__exam.takes||{};window.__exam.takes[t.id]=[{url:'blob:fake1',blob:null,asr:'a'},{url:'blob:fake2',blob:null,asr:'b'}];
  window.__exam.renderSpeaking();return true})()`);
await sleep(300);
check('显示已录 2 次',/已录 2 次/.test(await evalJs(`document.querySelector('#takesBox').innerText`)));
check('有播放按钮',(await evalJs(`document.querySelectorAll('#takesBox [data-play]').length`))===2);
check('有删除按钮',(await evalJs(`document.querySelectorAll('#takesBox [data-del]').length`))===2);
await evalJs(`document.querySelector('#takesBox [data-del]').click()`);await sleep(200);
check('删除后剩 1 次',/已录 1 次/.test(await evalJs(`document.querySelector('#takesBox').innerText`)));

// 中年级朗读更长但受控
const mid=await evalJs(`(()=>{const s=buildSpeaking(600);const t=s[s.length-1];return {words:t.passage.trim().split(/\\s+/).length};})()`);
check('中级朗读 ≤55 词',mid.words<=55,'words='+mid.words);

chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode=failures?1:0;
