// 写作提交 + 低龄中文题目 验证（临时副本）
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9431;
const tmp=path.join(os.tmpdir(),'ops-write-'+Date.now());
fs.mkdirSync(tmp,{recursive:true});
const page=path.join(tmp,'a.html');
fs.copyFileSync(path.resolve('public/english-assessment.html'),page);
const URL_='file:///'+page.replace(/\\/g,'/');
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let failures=0;const check=(n,ok,extra)=>{if(!ok)failures++;console.log(`${ok?'PASS':'FAIL'} · ${n}${extra?' :: '+extra:''}`)};

const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--remote-allow-origins=*',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=${path.join(tmp,'p')}`,'about:blank'],{stdio:'ignore'});
async function waitChrome(){for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)return}catch{}await sleep(200)}throw new Error('no chrome')}
let send;const events=[];
async function connect(u){const ws=new WebSocket(u);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
  let seq=0;const pend=new Map();
  ws.onmessage=(m)=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{r,j}=pend.get(d.id);pend.delete(d.id);d.error?j(new Error(JSON.stringify(d.error))):r(d.result)}else if(d.method)events.push(d)};
  send=(method,params={})=>new Promise((r,j)=>{const id=++seq;pend.set(id,{r,j});ws.send(JSON.stringify({id,method,params}))})}
const evalJs=async(e,ms=15000)=>{const p=send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});
  const t=new Promise((_,j)=>setTimeout(()=>j(new Error('eval timeout')),ms));const r=await Promise.race([p,t]);
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
  return r.result?.value};

await waitChrome();
const tg=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
await connect(tg.webSocketDebuggerUrl);
for(const m of ['Page.enable','Runtime.enable'])await send(m);
await send('Page.navigate',{url:URL_});await sleep(1500);
await evalJs('window.alert=()=>{};true');

function buildState(levelId,writeId){
  return `(()=>{
    const E=window.__exam;
    E.level={id:${JSON.stringify(levelId)},label:${JSON.stringify(levelId==='beginner'?'初级':'高级')},grade:'小学三年级',lex:300};
    E.grade='小学三年级';E.lex=430;
    E.admin=[{id:'beginner-r1',lex:300,correct:3,total:4,pct:0.75}];
    E.listenItems=[{id:'l1',script:'Hello',questions:[{id:'lq1',q:'Q?',options:['a','b'],answer:'a'}],saved:{}}];
    E.answers={lq1:'a',d1:'I have a red bag.',s1:'I am fine.'};
    E.dictItems=[{id:'d1',answer:'I have a red bag.'}];
    E.speakTasks=[{kind:'speak',part:'Part 1',id:'s1',minWords:10,question:'Hi'}];
    E.paResults={};E.writeItem={id:${JSON.stringify(writeId)},prompt:'Write about your day.',minWords:20};
    E.sec='write';E.startWriting();return true})()`;
}

// 1. 低龄写作：中文题目
await evalJs(buildState('beginner','b-w2'));
const prompt1=await evalJs(`document.querySelector('#writePrompt').textContent`);
check('1–3 年级写作题目是中文', /写两句话介绍你最喜欢的食物/.test(prompt1), prompt1);
check('保留英文原题（小字）', /Write two sentences about your favourite food/.test(await evalJs(`document.querySelector('#writeInstr').textContent`)));

// 2. 提交后出报告
await evalJs(`(()=>{const t=document.querySelector('#writeText');t.value='I like noodles because they are nice.';t.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#writeSubmit').click();return true})()`);
await sleep(2500);
check('点击提交后报告出现', (await evalJs(`!document.querySelector('#screen-report').classList.contains('hidden')`))===true);
check('报告含英语测评报告', /英语测评报告/.test(await evalJs('document.body.innerText')));
check('报告含本级课程目标', /本级课程目标/.test(await evalJs('document.body.innerText')));
const exc1=events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails?.exception?.description||e.params.exceptionDetails?.text);
check('提交过程无 JS 异常', exc1.length===0, exc1.slice(0,1).join(''));

// 3. 中年级写作中文；高级写作保持英文
await send('Page.navigate',{url:URL_});await sleep(1200);await evalJs('window.alert=()=>{};true');
await evalJs(buildState('intermediate','i-w3'));
check('4–6 年级写作题目是中文', /写一条约 40 词的消息/.test(await evalJs(`document.querySelector('#writePrompt').textContent`)));
await send('Page.navigate',{url:URL_});await sleep(1200);await evalJs('window.alert=()=>{};true');
await evalJs(buildState('advanced','a-w1'));
const adv=await evalJs(`document.querySelector('#writePrompt').textContent`);
check('高级写作保持英文', /Write an email to a colleague/.test(adv), adv);

chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode=failures?1:0;
