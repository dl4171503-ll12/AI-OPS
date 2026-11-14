// 学习玩法验证（临时副本 file://，不访问 918 页面）
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9381;
const tmp=path.join(os.tmpdir(),'ops-gamify-'+Date.now());
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
await send('Page.navigate',{url:URL_});await sleep(1500);

check('游戏条显示',(await evalJs(`!document.querySelector('#gameBar').classList.contains('hidden')`))===true);
check('游戏条含 XP/连胜',/XP/.test(await evalJs(`document.querySelector('#gameBar').innerText`)));
check('学习路径 4 个单元',(await evalJs(`document.querySelectorAll('#pathBox .unit').length`))===4);
const startBtn=await evalJs(`document.querySelector('#pathBox .lessonbtn') && true`);
check('有可点的课',startBtn===true);
await evalJs(`document.querySelector('#pathBox .lessonbtn').click()`);await sleep(500);
check('进入学习课',(await evalJs(`!document.querySelector('#screen-learn').classList.contains('hidden')`))===true);
const st=await evalJs(`({n:window.__learn.queue.length,hearts:window.__learn.hearts,xp:window.__learn.xp})`);
check('一课 8 题、5 颗心',st.n===8&&st.hearts===5,JSON.stringify(st));
check('显示爱心',/❤️/.test(await evalJs(`document.querySelector('#learnHearts').innerText`)));

// 第一题答对
const ans1=await evalJs(`window.__learn.queue[0] && window.__learn.queue[0].answer`);
await evalJs(`(()=>{const t=${JSON.stringify(ans1)};for(const b of document.querySelectorAll('#learnOptions .opt')){if(b.textContent===t){b.click();return true}}return false})()`);
await sleep(200);
check('答对显示绿色反馈',/太棒了/.test(await evalJs(`document.querySelector('#learnFb').innerText`)));
check('答对后 XP 增加',(await evalJs(`window.__learn.xp`))>=10);
await evalJs(`document.querySelector('#learnNext').click()`);await sleep(300);

// 第二题故意答错
const ans2=await evalJs(`window.__learn.queue[1] && window.__learn.queue[1].answer`);
await evalJs(`(()=>{const t=${JSON.stringify(ans2)};for(const b of document.querySelectorAll('#learnOptions .opt')){if(b.textContent!==t){b.click();return true}}return false})()`);
await sleep(200);
check('答错扣心（4/5）',(await evalJs(`window.__learn.hearts`))===4);
check('答错显示正确答案',/正确答案/.test(await evalJs(`document.querySelector('#learnFb').innerText`)));
await evalJs(`document.querySelector('#learnNext').click()`);await sleep(300);

// 存盘
const saved=await evalJs(`JSON.parse(localStorage.getItem('ops-en-gamify:v1')||'{}')`);
check('XP/生命写入本地',saved.xp>=10&&saved.hearts===4,JSON.stringify(saved));
check('SRS 已记录',saved.srs&&Object.keys(saved.srs).length>=2,Object.keys(saved.srs||{}).length+' 条');

// 刷新后游戏条仍在
await send('Page.navigate',{url:URL_});await sleep(1300);
check('刷新后 XP 仍在',/XP/.test(await evalJs(`document.querySelector('#gameBar').innerText`)));

chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode=failures?1:0;
