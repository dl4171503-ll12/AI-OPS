// 917 多页学习站点验收：首页 / 课程路径 / 上课 / 测评后跳转
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9441;
const BASE = 'http://127.0.0.1:917';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (n, ok, extra) => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} · ${n}${extra ? ' :: ' + extra : ''}`); };

const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-first-run','--remote-allow-origins=*',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(os.tmpdir(), 'ops917-' + Date.now())}`, 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {} await sleep(200); }

const tg = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tg.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0; const pending = new Map(); const events = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const { r, j } = pending.get(d.id); pending.delete(d.id); d.error ? j(new Error(JSON.stringify(d.error))) : r(d.result); } else if (d.method) events.push(d); };
const send = (method, params = {}) => new Promise((r, j) => { const id = ++seq; pending.set(id, { r, j }); ws.send(JSON.stringify({ id, method, params })); });
for (const m of ['Page.enable', 'Runtime.enable']) await send(m);
const evalJs = async (e, ms = 15000) => {
  const p = send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  const t = new Promise((_, j) => setTimeout(() => j(new Error('eval timeout')), ms));
  const r = await Promise.race([p, t]);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
};
const nav = async (p) => { await send('Page.navigate', { url: BASE + p }); await sleep(1400); await evalJs('window.alert=()=>{};true'); };
const body = async () => await evalJs('document.body.innerText');
const exceptions = () => events.filter(e => e.method === 'Runtime.exceptionThrown').map(e => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text);

// 1. 首页（未测评）
await nav('/');
const home1 = await body();
check('首页标题', /学习主页/.test(await evalJs('document.title')));
check('首页有今日目标与硬性要求', /今日目标/.test(home1) && /1 个单元/.test(home1));
check('首页有 60 分钟精学安排', /今天怎么学（60 分钟）/.test(home1) && /30 分钟/.test(home1));
check('首页有碎片时间清单', /碎片时间/.test(home1) && /起床后/.test(home1) && /睡前/.test(home1));
check('未测评时引导去测评', /先完成测评/.test(home1));
check('首页显示 5 个单元', (await evalJs(`document.querySelectorAll('#unitList .unit').length`)) === 5);
check('首页无技术字样', !/Azure|MiniMax|API|TTS|ASR|localStorage|服务器|模型/.test(home1));

// 2. 注入"已完成测评"数据，首页应变成继续学习
await evalJs(`(()=>{
  const now=new Date().toISOString();
  localStorage.setItem('ops-en-exam-history:v1', JSON.stringify([{id:'h1',at:now,type:'full',level:'初级',grade:'小学三年级',overall:4,cefr:'B1',lex:430}]));
  localStorage.setItem('ops-en-plan:v1', JSON.stringify({teacherNote:'先练听力，每天十分钟。',lexLevel:{id:'L2',name:'蓝思中初级',band:'400L–700L',grade:'小学 4–6 年级',lex:430,range:'330L – 480L'},books:'300L – 450L'}));
  return true})()`);
await nav('/');
const home2 = await body();
check('测评后首页显示继续学习', /继续今天的课程/.test(home2));
check('首页显示蓝思定级', /L2 蓝思中初级/.test(home2) && /330L – 480L/.test(home2));
check('首页显示老师的话', /先练听力/.test(home2));
check('按测评自动选教材路线', /教材与路线/.test(home2) && /Oxford Discover 2/.test(home2), home2.match(/主教材[^\n]*/)?.[0] || '');
check('纸质教材进度可跟踪', /纸质教材进度/.test(home2) && /Unit 1 \/ 12/.test(home2));
check('页面已去掉猫头鹰图案', !/🦉/.test(home2));
const cta = await evalJs(`document.querySelector('#heroBtn').getAttribute('href')`);
check('继续学习按钮指向课程', /lesson\.html\?u=1&c=1&l=1/.test(cta), cta);

// 3. 课程路径：单元→章节→小节
await nav('/learn.html');
check('课程路径 5 个单元', (await evalJs(`document.querySelectorAll('#units .unit').length`)) === 5);
check('第 1 单元 5 个章节', (await evalJs(`document.querySelectorAll('#unit-1 .chapter').length`)) === 5);
check('第 1 章 5 个小节', (await evalJs(`document.querySelectorAll('#unit-1 .chapter')[0].querySelectorAll('.node').length`)) === 5);
check('小节显示听说读写等学习方式', /听力|阅读|口语|写作|听写|词汇/.test(await evalJs(`document.querySelectorAll('#unit-1 .chapter')[0].innerText`)));
check('未解锁单元显示锁定', /未解锁/.test(await evalJs(`document.querySelectorAll('#units .unit')[1].innerText`)));

// 4. 上课：完成第 1 单元第 1 章第 1 节
await nav('/lesson.html?u=1&c=1&l=1');
check('上课页加载', /第 1 章/.test(await body()));
check('有爱心与进度条', (await evalJs(`!!document.querySelector('#hearts') && !!document.querySelector('#bar')`)) === true);
for (let i = 0; i < 7; i++) {
  const st = await evalJs(`window.__lessonDebug.state()`);
  if (!st.q) break;
  await evalJs(`window.__lessonDebug.answerCorrect()`);
  await sleep(120);
  const btn = await evalJs(`!!document.querySelector('#nextBtn')`);
  if (btn) await evalJs(`document.querySelector('#nextBtn').click()`);
  await sleep(150);
}
await sleep(600);
check('完成页出现', /完成本节|心用完了/.test(await body()));
const prog = await evalJs(`JSON.parse(localStorage.getItem('ops917-progress:v1')||'{}')`);
check('进度已保存（1-1-1）', !!(prog.units && prog.units['1'] && prog.units['1'].chapters['1'] && prog.units['1'].chapters['1'].lessons['1']), JSON.stringify(prog.units && prog.units['1']));
check('今日完成小节数 +1', (prog.todayLessons || 0) >= 1);
check('获得经验 XP', (prog.xp || 0) > 0, 'xp=' + prog.xp);

// 5. 回课程页：第 1 节显示已完成
await nav('/learn.html');
check('课程页第 1 节标记完成', /✓/.test(await evalJs(`document.querySelectorAll('#unit-1 .chapter')[0].querySelectorAll('.node')[0].innerText`)));

// 6. 测评完成后强制回主页
await nav('/assessment.html');
await evalJs(`document.getElementById('screen-report').classList.remove('hidden')`);
await sleep(7500);
const pathname = await evalJs('location.pathname');
check('测评完成后自动进入主页', pathname === '/', pathname);

const exc = exceptions().filter(x => !/favicon/.test(x || ''));
check('无 JS 异常', exc.length === 0, exc.slice(0, 2).join(' | '));

chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode = failures ? 1 : 0;
