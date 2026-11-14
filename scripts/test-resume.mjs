// 自动留存/恢复 + 自适应 + 语音兜底验收
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9491;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let failures=0;const check=(n,ok,extra)=>{if(!ok)failures++;console.log(`${ok?'PASS':'FAIL'} · ${n}${extra?' :: '+extra:''}`)};

const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--remote-allow-origins=*',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=${path.join(os.tmpdir(),'ops-resume-'+Date.now())}`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break}catch{}await sleep(200)}
const tg=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(tg.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let seq=0;const pend=new Map();const ev=[];
ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{r,j}=pend.get(d.id);pend.delete(d.id);d.error?j(new Error(JSON.stringify(d.error))):r(d.result)}else if(d.method)ev.push(d)};
const send=(method,params={})=>new Promise((r,j)=>{const id=++seq;pend.set(id,{r,j});ws.send(JSON.stringify({id,method,params}))});
for(const m of ['Page.enable','Runtime.enable'])await send(m);
const evalJs=async(e)=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value};
const nav=async(u)=>{await send('Page.navigate',{url:u});await sleep(1400);await evalJs('window.alert=()=>{};true')};
const ans=async(t)=>{await evalJs(`(()=>{const i=document.querySelector('#answer');i.value=${JSON.stringify(t)};i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#sendBtn').click();return true})()`);await sleep(3800)};

const URL='http://127.0.0.1:917/tutor.html?book=od1&unit=1&lesson=1';
await nav(URL);
const startClass = async () => { await evalJs(`document.querySelector('#startBtn').click()`); await sleep(300); await evalJs(`(()=>{const b=document.querySelector('#humanBox');if(b){b.checked=true;b.dispatchEvent(new Event('change'));}return true})()`); await sleep(1600); };
await evalJs("localStorage.setItem('ops917-min-minutes','0');true");
await startClass();await sleep(4000);
await ans('My family is big.');
const saved=await evalJs(`window.__resumeInfo()`);
check('学习记录自动保存', saved && saved.idx>=1 && saved.history.length>=2, 'idx=' + (saved&&saved.idx));
check('记录含题目与正确数', saved && saved.questions && saved.questions.length>0, 'q=' + (saved&&saved.questions&&saved.questions.length));

// 刷新后恢复
await nav(URL);
const box=await evalJs(`document.querySelector('#resumeBox').style.display`);
check('刷新后出现"继续上次课程"', box==='block', 'display='+box);
await evalJs(`document.querySelector('#resumeBtn').click()`);await sleep(800);
const chat=await evalJs(`document.querySelector('#chat').innerText`);
check('一键恢复交流记录', /My family is big/.test(chat), chat.slice(-80));
check('恢复到原来进度', /已恢复/.test(await evalJs(`document.querySelector('#progressHint').textContent`)));
// 恢复后只能朗读最新一条老师消息，不能批量朗读历史
const ttsRestore=await evalJs(`(window.__ttsCalls||0)`);
const msgCount=await evalJs(`document.querySelectorAll('#chat .msg').length`);
await sleep(2500);
const ttsAfterRestore=await evalJs(`(window.__ttsCalls||0)`);
check('恢复后最多只朗读一条老师消息', ttsAfterRestore-ttsRestore<=1, `tts ${ttsRestore} -> ${ttsAfterRestore}, msgs=${msgCount}`);

// 答错一题，然后强制结束 → 自适应记录薄弱词/降低难度
await ans('nonsense');
await evalJs(`window.__forceFinish()`);await sleep(1500);
const mastery=await evalJs(`JSON.parse(localStorage.getItem('ops917-mastery:v1')||'{}')`);
check('保存每课表现与薄弱词', !!(mastery.lessons && mastery.lessons['1-1'] && Object.keys(mastery.words||{}).length>0), JSON.stringify(mastery).slice(0,120));
const reviewBtn=await evalJs(`!!document.querySelector('#reviewBtn')`);
check('出现"复习薄弱词"入口', reviewBtn===true);
const pace=await evalJs(`localStorage.getItem('ops917-pace')`);
check('自适应调整了练习量', pace==='less'||pace==='more', 'pace='+pace);

// 语音 402 兜底与友好提示
const friendly=await evalJs(`window.__friendlyVoiceError(402,{type:'error',error:{type:'insufficient_balance_error',message:'insufficient balance (1008)'}})`);
check('额度不足给出友好提示（不显示原始 JSON）', /额度不足/.test(friendly), friendly);
check('浏览器语音兜底可用', (await evalJs(`typeof window.__browserASR`))==='function');
// 模拟 TTS 402：应走浏览器语音兜底而不是报错
await evalJs(`(()=>{const orig=window.fetch.bind(window);window.fetch=(u,o)=>{ if(String(u).includes('/api/school-tts')) return Promise.resolve(new Response('{"error":{"type":"insufficient_balance_error"}}',{status:402})); return orig(u,o); };return true})()`);
await evalJs(`document.querySelector('.say')?document.querySelector('.say').click():0`);
await sleep(500);
check('老师不能说话时自动切换浏览器语音', (await evalJs(`window.__ttsFallbackTried`))===true);

const exc=ev.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails?.exception?.description||e.params.exceptionDetails?.text).filter(x=>!/favicon/.test(x||''));
check('无 JS 异常', exc.length===0, exc.slice(0,1).join(''));

chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode=failures?1:0;
