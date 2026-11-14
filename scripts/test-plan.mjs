// 学习方案必须由测评报告生成（临时副本验证）
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9401;
const tmp=path.join(os.tmpdir(),'ops-plan-'+Date.now());
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

// 1. 未测评：不显示学习内容
check('有年级选择',(await evalJs(`!!document.querySelector('#gradeSel')`))===true);
const introText=await evalJs(`document.body.innerText`);
check('未测评时提示先完成测评',/先完成测评/.test(introText));
check('未测评时没有课程按钮',(await evalJs(`document.querySelectorAll('.lessonbtn').length`))===0);
check('旧的通用学习路径已移除',(await evalJs(`!document.querySelector('#pathBox')`))===true);
check('学生界面无技术字样',
  !/Azure|MiniMax|API|TTS|ASR|localStorage|服务器|接口|模型/.test(introText));

// 2. 报告生成教案（蓝思 430 → L2）
const planInfo=await evalJs(`(()=>{
  const exam={level:{id:'beginner',label:'初级'},grade:'小学三年级',dictScores:[{answer:'I have a red bag.',acc:0},{answer:'My mother likes apples.',acc:1}]};
  const scores={overall:4.0,cefr:'B1',lex:430,listen:3.0,speak:5.5,read:3.5,write:4.5};
  const plan=buildPlan(exam,scores);
  window.__testPlan=plan;Store.savePlan(plan);renderPlanCard();
  return {weeks:plan.weeks.length,focus:plan.focus.map(f=>f.skill),weakest:plan.focus[0].skill,
    wrong:plan.review.dictWrong.length,lessons:plan.weeks[0].lessons.length,note:plan.note,
    lexLevel:plan.lexLevel,lexFunc:[lexLevel(430).id,lexLevel(700).id,lexLevel(1600).next],
    curriculum:plan.curriculum};
})()`);
check('教案 4 周',planInfo.weeks===4);
check('最弱项=听力（按报告）',planInfo.weakest==='听力',JSON.stringify(planInfo.focus));
check('错题进入复习清单',planInfo.wrong===1);
check('每周 3 课',planInfo.lessons===3);
check('教案写了依据',/最弱项 听力/.test(planInfo.note),planInfo.note);
check('蓝思定级边界正确（430→L2、700→L3、1600 无下一级）',
  planInfo.lexFunc[0]==='L2'&&planInfo.lexFunc[1]==='L3'&&planInfo.lexFunc[2]===null,JSON.stringify(planInfo.lexFunc));
check('教案带蓝思定级与推荐区间',planInfo.lexLevel&&planInfo.lexLevel.id==='L2'&&/330L/.test(planInfo.lexLevel.range),
  JSON.stringify(planInfo.lexLevel&&{id:planInfo.lexLevel.id,range:planInfo.lexLevel.range}));
check('教案带本级课程目标（雅思/CEFR/四维）',
  planInfo.curriculum&&planInfo.curriculum.cefr==='A2'&&planInfo.curriculum.ieltsRange==='3.5–4.5'
  &&planInfo.curriculum.targets.listen===3.5&&planInfo.curriculum.targets.write===3.0,
  JSON.stringify(planInfo.curriculum&&{cefr:planInfo.curriculum.cefr,range:planInfo.curriculum.ieltsRange,t:planInfo.curriculum.targets}));

// 3. 有教案后出现课按钮
check('生成后出现课程按钮',(await evalJs(`document.querySelectorAll('#planCardBox .lessonbtn').length`))>=12);
check('显示依据',/依据/.test(await evalJs(`document.querySelector('#planCardBox').innerText`)));

// 3b. 老师写的教案（AI 结构）能正确展示
await evalJs(`(()=>{
  const ai=normalizeAiPlan({teacherNote:'每天听一句写一句，听力会越来越棒！',
    weeks:[{n:1,title:'听清每个词',focus:'listening',lessons:[{n:1,title:'听写我的小书包',focus:'listening'},{n:2,title:'颜色和物品',focus:'listening'},{n:3,title:'听句子选图',focus:'listening'}]},
           {n:2,title:'听懂小对话',focus:'listening',lessons:[{n:1,title:'听问句选回答'},{n:2,title:'听数字和名字'},{n:3,title:'边听边写'}]},
           {n:3,title:'巩固复习',focus:'mixed',lessons:[{n:1,title:'复习一'},{n:2,title:'复习二'},{n:3,title:'复习三'}]},
           {n:4,title:'综合运用',focus:'mixed',lessons:[{n:1,title:'综合一'},{n:2,title:'综合二'},{n:3,title:'综合三'}]}],
    books:'300L – 450L',review:['复习 red bag']});
  ai.id='plan-ai';ai.createdAt=new Date().toISOString();ai.grade='小学三年级';ai.levelId='beginner';ai.levelLabel='初级';
  ai.focus=[{skill:'听力',band:3.0}];ai.overall=4;ai.cefr='B1';ai.lex=430;ai.lexLevel=lexLevel(430);ai.ai=true;ai.note='按报告生成';ai.review={dictWrong:[],list:['复习 red bag']};
  Store.savePlan(ai);renderPlanCard();return true})()`);
await sleep(300);
check('显示老师的话',/老师的话/.test(await evalJs(`document.querySelector('#planCardBox').innerText`)));
check('显示老师的鼓励语',/每天听一句写一句/.test(await evalJs(`document.querySelector('#planCardBox').innerText`)));
check('显示老师写的课名',/听写我的小书包/.test(await evalJs(`document.querySelector('#planCardBox').innerText`)));
// 课末评估回写后，教案卡显示"老师评估"
await evalJs(`(()=>{const p=Store.loadPlan();p.lastEvaluation={at:new Date().toISOString(),fit:'too-hard',advice:'这节课有点难，下次放慢一点。'};Store.savePlan(p);renderPlanCard();return true})()`);
await sleep(200);
check('教案卡显示老师评估',/老师评估/.test(await evalJs(`document.querySelector('#planCardBox').innerText`)));

// 4. 按教案开课
await evalJs(`document.querySelector('#planCardBox .lessonbtn').click()`);await sleep(500);
check('进入教案第一课',(await evalJs(`!document.querySelector('#screen-learn').classList.contains('hidden')`))===true);
const q=await evalJs(`({n:window.__learn.queue.length,hearts:window.__learn.hearts,plan:!!window.__learn.plan})`);
check('教案课 8 题、5 心、带 plan 上下文',q.n===8&&q.hearts===5&&q.plan===true,JSON.stringify(q));

// 5. 刷新后教案仍在
await send('Page.navigate',{url:URL_});await sleep(1300);
check('刷新后教案仍在',(await evalJs(`document.querySelectorAll('#planCardBox .lessonbtn').length`))>=12);

chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode=failures?1:0;
