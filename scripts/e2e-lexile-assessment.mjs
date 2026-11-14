// 英语测评 v3（听说读写 + 蓝思 + 雅思/朗思）· 浏览器验收
// 用法：node scripts/e2e-lexile-assessment.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9339;
const PAGE = 'http://127.0.0.1:918/english-assessment.html';
const OUT = path.resolve('docs/research/e2e');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (n, ok, extra) => { if (!ok) failures++; console.log(`${ok?'PASS':'FAIL'} · ${n}${extra?' :: '+extra:''}`); };

const chrome = spawn(CHROME, ['--disable-gpu','--no-first-run','--no-default-browser-check','--remote-allow-origins=*',
  '--window-size=1280,1000', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${path.join(os.tmpdir(),'ops-lex-'+Date.now())}`, 'about:blank'], { stdio:'ignore' });

async function waitChrome(){ for(let i=0;i<100;i++){ try{ if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return; }catch{} await sleep(200);} throw new Error('chrome not ready'); }
async function connect(wsUrl){
  const ws=new WebSocket(wsUrl);
  await new Promise((res,rej)=>{ ws.onopen=res; ws.onerror=()=>rej(new Error('ws')); });
  let seq=0; const pending=new Map(); const events=[];
  ws.onmessage=(m)=>{ const d=JSON.parse(m.data);
    if(d.id&&pending.has(d.id)){ const {res,rej}=pending.get(d.id); pending.delete(d.id); d.error?rej(new Error(JSON.stringify(d.error))):res(d.result); }
    else if(d.method) events.push(d); };
  const send=(method,params={})=>new Promise((res,rej)=>{ const id=++seq; pending.set(id,{res,rej}); ws.send(JSON.stringify({id,method,params})); });
  ws.onclose=()=>{ for(const {rej} of pending.values()) rej(new Error('cdp closed')); pending.clear(); };
  return { send, events, close:()=>ws.close() };
}

let cdp;
const evalJs=async(expression,ms=15000)=>{
  const p=cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  const t=new Promise((_,rej)=>setTimeout(()=>rej(new Error('evaluate timeout: '+String(expression).slice(0,60))),ms));
  const r=await Promise.race([p,t]);
  if(r.exceptionDetails) throw new Error(r.exceptionDetails.text+' '+(r.exceptionDetails.exception?.description||''));
  return r.result?.value;
};
const bodyText=async()=> (await evalJs('document.body.innerText'))||'';
const shot=async(name)=>{ const s=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const p=path.join(OUT,name); fs.writeFileSync(p,Buffer.from(s.data,'base64')); console.log('  screenshot -> '+p); };
const openPage=async()=>{ await cdp.send('Page.navigate',{url:PAGE}); await sleep(1400);
  await evalJs('window.alert=()=>{};window.confirm=()=>true;true'); };

const setVal=(sel,val)=>`(()=>{const el=document.querySelector('${sel}');
  const set=Object.getOwnPropertyDescriptor(el.constructor.prototype,'value').set;
  set.call(el,${JSON.stringify(val)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`;

async function readingRound(n){
  for(let i=0;i<n;i++){
    const visible=await evalJs(`!document.querySelector('#screen-read').classList.contains('hidden')`);
    if(!visible) break;
    await evalJs(`(()=>{for(const b of document.querySelectorAll('#readQuestions .qblock')){const o=b.querySelector('.opt');if(o)o.click()}return true})()`);
    await sleep(120);
    const disabled=await evalJs(`document.querySelector('#readSubmit').disabled`);
    if(disabled){ console.log('  (submit disabled, break)'); break; }
    await evalJs(`document.querySelector('#readSubmit').click()`);
    await sleep(350);
  }
}
async function listeningRound(){
  for(let i=0;i<3;i++){
    const visible=await evalJs(`!document.querySelector('#screen-listen').classList.contains('hidden')`);
    if(!visible) break;
    await evalJs(`document.querySelector('#playListen').click()`);
    await evalJs(`(()=>{for(const b of document.querySelectorAll('#listenQuestions .qblock')){const o=b.querySelector('.opt');if(o)o.click()}return true})()`);
    await sleep(120);
    await evalJs(`document.querySelector('#listenSubmit').click()`);
    await sleep(300);
  }
}
async function dictationRound(){
  for(let i=0;i<4;i++){
    const visible=await evalJs(`!document.querySelector('#screen-dictation').classList.contains('hidden')`);
    if(!visible) break;
    await evalJs(`document.querySelector('#playDict').click()`);
    const answer=await evalJs(`window.__exam.dictItems[${i}] && window.__exam.dictItems[${i}].answer`);
    await evalJs(setVal('#dictInput', answer || 'test sentence'));
    await sleep(100);
    await evalJs(`document.querySelector('#dictSubmit').click()`);
    await sleep(250);
  }
}
async function speakingRound(){
  let guard=0;
  while(guard++<10){
    const visible=await evalJs(`!document.querySelector('#screen-speak').classList.contains('hidden')`);
    if(!visible) break;
    const isRead=await evalJs(`window.__exam.speakTasks[window.__exam.speakIdx].readAloud`);
    if(!isRead){
      await evalJs(setVal('#speakText','I think it is good because it helps me learn new words and I use them every day. It is useful for my study.'));
    }
    await sleep(100);
    await evalJs(`document.querySelector('#speakSubmit').click()`);
    await sleep(300);
  }
}

async function main(){
  await waitChrome();
  const target=await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`,{method:'PUT'})).json();
  cdp=await connect(target.webSocketDebuggerUrl);
  for(const m of ['Page.enable','Runtime.enable','Log.enable','Network.enable']) await cdp.send(m);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});

  // 1. 开始页
  console.log('\n=== 1. 开始页（听说读写）===');
  await openPage();
  const t0=await bodyText();
  check('四个水平选项',(await evalJs(`document.querySelectorAll('.pick').length`))===4);
  check('流程含听力/听写/口语/写作', /听力/.test(t0) && /听写/.test(t0) && /口语/.test(t0) && /写作/.test(t0));
  check('提到达标雅思/朗思', /雅思/.test(t0) && /朗思/.test(t0));
  check('题库充分（≥30 篇）', (await evalJs(`window.__reading.length`))>=30);
  await shot('lex-01-intro.png');

  // 2. 阅读 5 篇
  console.log('\n=== 2. 阅读阶梯 ===');
  await evalJs(`document.querySelectorAll('.pick')[0].click()`); await sleep(100);
  await evalJs(`document.querySelector('#startBtn').click()`); await sleep(400);
  check('阅读第 1 / 5 篇', (await bodyText()).includes('第 1 / 5 篇'));
  check('低龄主图是真实图片', (await evalJs(`!!document.querySelector('#zhBox img')`)) === true);
  check('低龄题目配图（≥2 张）', (await evalJs(`document.querySelectorAll('#readQuestions .qimg').length`)) >= 2);
  await readingRound(5);
  const readState=await evalJs(`({n:window.__exam.admin.length, lex:window.__exam.lex, ids:window.__exam.admin.map(a=>a.id)})`);
  check('完成 5 篇', readState.n===5, 'n='+readState.n);
  check('5 篇不重复', new Set(readState.ids).size===readState.ids.length);

  // 3. 听力
  console.log('\n=== 3. 听力 ===');
  check('进入听力', await evalJs(`!document.querySelector('#screen-listen').classList.contains('hidden')`));
  check('听力有播放按钮', await evalJs(`!!document.querySelector('#playListen')`));
  await evalJs(`document.querySelector('#playListen').click()`);
  await sleep(2500);
  const tts1=await evalJs(`({ok:window.__tts.ok,status:window.__tts.lastStatus,calls:window.__tts.calls})`);
  check('听力使用真人 TTS（非浏览器代码音）', tts1.ok>=1 && tts1.status==='playing', JSON.stringify(tts1));
  await shot('lex-02-listening.png');
  await listeningRound();
  const listenDone=await evalJs(`window.__exam.listenItems.every(m=>m.questions.every(q=>window.__exam.answers[q.id]!=null))`);
  check('听力 3 段全部作答', listenDone===true);

  // 4. 听写
  console.log('\n=== 4. 听写 ===');
  check('进入听写', await evalJs(`!document.querySelector('#screen-dictation').classList.contains('hidden')`));
  check('听写 4 句', (await evalJs(`window.__exam.dictItems.length`))===4);
  await evalJs(`document.querySelector('#playDict').click()`);
  await sleep(1800);
  const ttsDict=await evalJs(`window.__tts.ok`);
  check('听写使用真人 TTS', ttsDict>=2, 'ok='+ttsDict);
  await shot('lex-03-dictation.png');
  await dictationRound();
  const dictDone=await evalJs(`window.__exam.dictItems.every(d=>window.__exam.answers[d.id])`);
  check('听写 4 句全部提交', dictDone===true);

  // 5. 口语（录音按钮 + 朗读题 + 转写）
  console.log('\n=== 5. 口语 ===');
  check('进入口语', await evalJs(`!document.querySelector('#screen-speak').classList.contains('hidden')`));
  check('有录音按钮', await evalJs(`!!document.querySelector('#recBtn')`));
  check('有听题按钮', await evalJs(`!!document.querySelector('#playSpeakQ')`));
  const hasRead=await evalJs(`window.__exam.speakTasks.some(t=>t.readAloud)`);
  check('口语含朗读题（发音计入测评）', hasRead===true);
  await evalJs(`document.querySelector('#playSpeakQ').click()`);
  await sleep(1800);
  check('口语听题使用真人 TTS', (await evalJs(`window.__tts.ok`))>=3, 'ok='+(await evalJs(`window.__tts.ok`)));
  await shot('lex-04-speaking.png');
  await speakingRound();
  const speakDone=await evalJs(`window.__exam.speakTasks.every(t=>window.__exam.answers[t.id])`);
  check('口语全部提交（含朗读）', speakDone===true);

  // 6. 写作
  console.log('\n=== 6. 写作 ===');
  check('进入写作', await evalJs(`!document.querySelector('#screen-write').classList.contains('hidden')`));
  await evalJs(setVal('#writeText','I usually get up at seven o clock. First, I wash my face and eat breakfast. Then I go to school by bus. In the evening, I do my homework and read a book. I think my daily routine is healthy and I like it.'));
  await sleep(150);
  await shot('lex-05-writing.png');
  await evalJs(`document.querySelector('#writeSubmit').click()`);
  await sleep(600);

  // 7. 报告
  console.log('\n=== 7. 报告（雅思/朗思口径）===');
  const rep=await bodyText();
  check('报告标题', rep.includes('英语测评报告'));
  check('整体分数（雅思）', /雅思整体（预估）/.test(rep) && /\d+\.\d/.test(rep));
  check('CEFR 标签', /CEFR [ABC][12]/.test(rep));
  check('朗思笔试 Grade', /朗思笔试 \d+\/150 · (High Pass|Pass|Fail)/.test(rep));
  check('朗思口语 Grade', /朗思口语 \d+\/50 · (High Pass|Pass|Fail)/.test(rep));
  check('四项技能表', /听力[\s\S]{0,80}口语[\s\S]{0,80}阅读[\s\S]{0,80}写作/.test(rep));
  check('人话解释（逐项说明）', /这意味着/.test(rep) && /（答对/.test(rep));
  check('阅读蓝思值', /蓝思/.test(rep) && /推荐阅读范围/.test(rep));
  check('口语明细含发音', rep.includes('口语明细（含发音）'));
  check('发音未配置显示待配置', /待配置/.test(rep));
  check('听写明细', rep.includes('听写明细'));
  check('下一步建议', rep.includes('下一步怎么练'));
  check('无遗留的独立发音卡标题', !rep.includes('发音评测（Azure）'));
  check('报告图（蓝思标尺+阶梯）', (await evalJs(`document.querySelectorAll('#screen-report svg').length`))>=2);
  await shot('lex-06-report.png');

  // 8. 基准测
  console.log('\n=== 8. 基准测 ===');
  await openPage();
  await evalJs(`document.querySelector('#benchBtn').click()`); await sleep(400);
  await readingRound(3);
  const b1=await bodyText();
  check('基准结果页', b1.includes('快速基准测结果'));
  check('基准显示蓝思值', /蓝思参考值/.test(b1));
  const hist1=await evalJs(`JSON.parse(localStorage.getItem('ops-en-benchmark-history:v3')||'[]').length`);
  check('历史写入 1 条', hist1===1, 'hist='+hist1);

  // 9. 异常笔迹
  console.log('\n=== 9. 异常操作停止写入 ===');
  await openPage();
  await evalJs(`document.querySelectorAll('.pick')[1].click()`); await sleep(100);
  await evalJs(`document.querySelector('#startBtn').click()`); await sleep(300);
  await evalJs(`document.querySelector('#draftToggle').click()`); await sleep(250);
  await evalJs(`(()=>{const c=document.querySelector('#board'),r=c.getBoundingClientRect();
    const fire=(t,x,y)=>c.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,pointerId:99,pointerType:'mouse',clientX:r.left+x,clientY:r.top+y,pressure:0.5,isPrimary:true}));
    fire('pointerenter',40,80);fire('pointerdown',40,80);
    let x=40;const id=setInterval(()=>{x+=12;fire(x<r.width-40?'pointermove':'pointerup',x,80);if(x>=r.width-40)clearInterval(id);},8);return true})()`);
  await sleep(1000);
  check('后台判定异常', (await evalJs(`window.__guard.locked`))===true);
  check('用户看到停止提示', (await evalJs(`document.querySelector('#lockOverlay').classList.contains('show')`))===true);

  const exceptions=cdp.events.filter(e=>e.method==='Runtime.exceptionThrown')
    .map(e=>e.params.exceptionDetails?.exception?.description||e.params.exceptionDetails?.text);
  const httpErrors=cdp.events.filter(e=>e.method==='Network.responseReceived'&&e.params.response.status>=400)
    .map(e=>`${e.params.response.status} ${e.params.response.url}`)
    .filter(x=>!/favicon/i.test(x)&&!/\/api\/pronunciation/.test(x));
  check('无未捕获 JS 异常', exceptions.length===0, exceptions.slice(0,2).join(' | '));
  check('无 4xx/5xx', httpErrors.length===0, httpErrors.slice(0,3).join(' | '));

  cdp.close();
  await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(()=>{});
}
try{ await main(); }catch(e){ failures++; console.error('E2E 异常：',e); }
finally{ try{chrome.kill();}catch{} console.log(`\n[result] failures=${failures}`); process.exitCode=failures===0?0:1; }
