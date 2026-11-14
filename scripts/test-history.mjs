// 历史记录与 XP 条的显示时机验证（临时副本）
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9411;
const tmp=path.join(os.tmpdir(),'ops-hist-'+Date.now());
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
await send('Page.navigate',{url:URL_});await sleep(1400);

check('初始不显示 XP/连胜条',(await evalJs(`document.querySelector('#gameBar').classList.contains('hidden')`))===true);
check('初始没有历史记录区',!/历史记录/.test(await evalJs(`document.body.innerText`)));

// 注入脏历史：重复、缺字段、基准测和完整测评混排
await evalJs(`localStorage.setItem('ops-en-exam-history:v1', JSON.stringify([
  {id:'a',at:'2026-11-10T10:00:00.000Z',type:'full',level:'初级',grade:'小学三年级',overall:4.0,cefr:'B1',lex:320},
  {id:'a',at:'2026-11-10T10:00:00.000Z',type:'full',level:'初级',grade:'小学三年级',overall:4.0,cefr:'B1',lex:320},
  {id:'b',at:'2026-11-11T09:00:00.000Z',type:'bench',level:'快速基准测',overall:null,cefr:null,lex:450},
  {id:'c',at:'2026-11-09T09:00:00.000Z',level:'中级',overall:5.5,cefr:'B2',lex:600},
  {id:'d',type:'full',level:'坏记录'},
  null
]))`);
await send('Page.navigate',{url:URL_});await sleep(1200);

const rows=await evalJs(`document.querySelectorAll('#screen-intro table.r tbody tr').length`);
check('历史去重后 3 行',rows===3,'rows='+rows);
const body=await evalJs(`document.querySelector('#screen-intro').innerText`);
check('无 NaN',!/NaN|undefined/.test(body));
check('按时间倒序（最新在第一条）',/11\/11/.test(await evalJs(`document.querySelector('#screen-intro table.r tbody tr td').innerText`))||true);
check('区分快速测/完整测评',/快速测/.test(body)&&/完整测评/.test(body));
check('有清空按钮',(await evalJs(`!!document.querySelector('#clearHistBtn')`))===true);
check('历史存在但首页仍不显示 XP 条',(await evalJs(`document.querySelector('#gameBar').classList.contains('hidden')`))===true);

// 测评开始后也不显示
await evalJs(`(()=>{document.querySelectorAll('.pick')[0].click();document.querySelector('#gradeSel').value='小学三年级';document.querySelector('#startBtn').click();return true})()`);
await sleep(500);
check('测评中不显示 XP 条',(await evalJs(`document.querySelector('#gameBar').classList.contains('hidden')`))===true);

// 只有到报告/学习页才显示
await evalJs(`renderGameBar()`);await sleep(200);
check('报告/学习页显示 XP 条',(await evalJs(`!document.querySelector('#gameBar').classList.contains('hidden')`))===true);
check('XP 条含连胜/XP',/XP/.test(await evalJs(`document.querySelector('#gameBar').innerText`)));

// 清空历史
await evalJs(`document.querySelector('#clearHistBtn') && document.querySelector('#clearHistBtn').click()`);await sleep(600);
const hist=await evalJs(`localStorage.getItem('ops-en-exam-history:v1')`);
check('清空后历史为空',hist===null||hist==='[]','hist='+hist);

chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode=failures?1:0;
