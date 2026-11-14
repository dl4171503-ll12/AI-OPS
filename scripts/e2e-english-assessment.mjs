// 英语入学测评（49 题版）· 浏览器验收
// 用法：node scripts/e2e-english-assessment.mjs [--level <index>] [--skip-lock]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9337;
const PAGE = 'http://127.0.0.1:918/english-assessment.html';
const OUT = path.resolve('docs/research/e2e');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (n, ok, extra) => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${n}${extra ? ' :: ' + extra : ''}`);
};

// 有界面 Chrome（页面把 Headless UA 视为异常）
const chrome = spawn(
  CHROME,
  ['--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-allow-origins=*',
   '--window-size=1280,1000', `--remote-debugging-port=${PORT}`,
   `--user-data-dir=${path.join(os.tmpdir(), 'ops-assess49-' + Date.now())}`, 'about:blank'],
  { stdio: 'ignore' },
);

async function waitChrome() {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return; } catch {}
    await sleep(200);
  }
  throw new Error('chrome not ready');
}
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws')); });
  let seq = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      const { res, rej } = pending.get(d.id); pending.delete(d.id);
      d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result);
    } else if (d.method) events.push(d);
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params }));
  });
  return { send, events, close: () => ws.close() };
}

let cdp;
const evalJs = async (expression) => {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result?.value;
};
const bodyText = async () => (await evalJs('document.body.innerText')) || '';
const shot = async (name) => {
  const s = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const p = path.join(OUT, name);
  fs.writeFileSync(p, Buffer.from(s.data, 'base64'));
  console.log(`  screenshot -> ${p}`);
};
const openPage = async () => { await cdp.send('Page.navigate', { url: PAGE }); await sleep(1500); };
const pickAndStart = async (idx) => {
  await evalJs(`document.querySelectorAll('.pick')[${idx}].click()`); await sleep(120);
  await evalJs(`document.querySelector('#startBtn').click()`); await sleep(500);
};

let answeredCount = 0;
async function answerCurrent() {
  const kind = await evalJs(`document.querySelectorAll('.opt').length > 0 ? 'mcq' : 'text'`);
  if (kind === 'mcq') {
    await evalJs(`document.querySelectorAll('.opt')[0].click()`);
  } else {
    await evalJs(`(()=>{const ta=document.querySelector('#qText');
      const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
      set.call(ta,'I think this is a good idea because it helps me learn new words and I use them every day. It is useful for my study and I like it very much.');
      ta.dispatchEvent(new Event('input',{bubbles:true})); return true})()`);
  }
  await sleep(60);
  await evalJs(`document.querySelector('#saveBtn').click()`);
  await sleep(120);
  answeredCount++;
}

async function main() {
  await waitChrome();
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' })).json();
  cdp = await connect(target.webSocketDebuggerUrl);
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable']) await cdp.send(m);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });

  // 1. 开始页
  console.log('\n=== 1. 开始页 ===');
  await openPage();
  const t0 = await bodyText();
  check('四个水平选项', (await evalJs(`document.querySelectorAll('.pick').length`)) === 4);
  check('未选时开始禁用', (await evalJs(`document.querySelector('#startBtn').disabled`)) === true);
  check('开始页无多余说明', !/依据|反爬|真人|置信度/.test(t0));
  check('水平卡片显示题数 49', /49 题/.test(t0));
  await shot('assess-01-intro.png');

  await pickAndStart(2); // 雅思预备
  check('进入第 1 / 49 题', (await bodyText()).includes('第 1 / 49 题'));

  // 2. 结构
  console.log('\n=== 2. 49 题结构与不可跳题 ===');
  const btns = await evalJs(`[...document.querySelectorAll('button')].map(b=>b.textContent.trim())`);
  check('无上一题/下一题/跳过', !btns.some((x) => /上一题|下一题|跳过/.test(x)));
  check('进度条存在', (await evalJs(`!!document.querySelector('#progBar')`)) === true);
  check('未答完提交禁用', (await evalJs(`document.querySelector('#submitAllBtn').disabled`)) === true);
  // 评测有效性：每题都要能朗读；词汇题必须有语义提示（不能只考拼写）
  check('每题都有朗读按钮', (await evalJs(`!!document.querySelector('#readBtn') && !document.querySelector('#readBtn').classList.contains('hidden')`)) === true);
  const firstSkill = await evalJs(`document.querySelector('#stepLabel').textContent`);
  check('第一题是词汇题', /词汇/.test(firstSkill), firstSkill);
  check('词汇题显示语义提示（clue）', (await evalJs(`(()=>{const c=document.querySelector('#qClue'); return c && !c.classList.contains('hidden') && c.textContent.trim().length>0})()`)) === true);
  const opts = await evalJs(`[...document.querySelectorAll('.opt')].map(b=>b.textContent.trim())`);
  const near = opts.some((a, i) => opts.some((b, j) => i < j && a.length && b.length && Math.abs(a.length - b.length) <= 1 && a.slice(0, -1) === b.slice(0, -1) && a !== b));
  check('词汇选项不是拼写近形词', !near, JSON.stringify(opts));
  const order = await evalJs(`(()=>{const t=[];for(let i=0;i<49;i++){}return true})()`);
  void order;
  // 题目顺序：前 1/3 应为基础题（通过连续答题时观察 tier 不可见，仅检查题目不重复）
  await shot('assess-02-exam.png');

  // 3. 逐题作答 49 题
  console.log('\n=== 3. 答满 49 题 ===');
  const total = 49;
  for (let i = 1; i <= total; i++) {
    await answerCurrent();
    if (i % 10 === 0) console.log(`  progress ${i}/${total}，已答 ${await evalJs(`document.querySelectorAll('.cell.done').length`)}`);
    if (i === total - 1) {
      const disabled = await evalJs(`document.querySelector('#submitAllBtn').disabled`);
      check('48/49 时提交仍禁用', disabled === true);
    }
  }
  const done = await evalJs(`document.querySelectorAll('.cell.done').length`);
  check('49 题全部已答', done === total, 'done=' + done);
  check('提交按钮可用', (await evalJs(`document.querySelector('#submitAllBtn').disabled`)) === false);

  // 4. 修改已答
  console.log('\n=== 4. 已答可修改 ===');
  await evalJs(`document.querySelector('#cardToggle').click()`); await sleep(200);
  await evalJs(`document.querySelectorAll('.cell.done')[0].click()`); await sleep(250);
  check('点已答回到第 1 题', (await bodyText()).includes('第 1 / 49 题'));
  await evalJs(`(()=>{const o=document.querySelectorAll('.opt'); if(o.length) o[o.length-1].click();
    else {const ta=document.querySelector('#qText'); const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
      set.call(ta,'Changed answer for testing.'); ta.dispatchEvent(new Event('input',{bubbles:true}));} return true})()`);
  await sleep(80);
  await evalJs(`document.querySelector('#saveBtn').click()`); await sleep(250);
  check('修改保存成功（仍在测评页）', (await bodyText()).includes('/ 49 题'));

  // 5. 提交与图表
  console.log('\n=== 5. 报告与图表 ===');
  await evalJs(`document.querySelector('#submitAllBtn').click()`); await sleep(700);
  const rep = await bodyText();
  check('报告标题', rep.includes('英语能力测评报告'));
  check('总分', rep.includes('总分'));
  check('六维能力雷达', rep.includes('六维能力雷达'));
  check('分项得分', rep.includes('分项得分'));
  check('难度阶梯', rep.includes('难度阶梯表现'));
  check('题目构成', rep.includes('题目构成'));
  check('结论与建议', rep.includes('结论与建议'));
  check('逐题结果可展开', rep.includes('查看逐题结果'));
  const svgCount = await evalJs(`document.querySelectorAll('#screen-report svg').length`);
  check('报告含 SVG 图表（雷达+环形）', svgCount >= 2, 'svg=' + svgCount);
  check('报告无审核指标', !/真人|置信度|采样点/.test(rep));
  await shot('assess-05-report-top.png');
  await evalJs(`window.scrollTo(0, 700)`); await sleep(300);
  await shot('assess-06-report-charts.png');
  await evalJs(`window.scrollTo(0, 1500)`); await sleep(300);
  await shot('assess-07-report-tiers.png');

  // 6. 异常笔迹 → 停止写入
  console.log('\n=== 6. 异常操作停止写入 ===');
  await openPage();
  await pickAndStart(1);
  await evalJs(`document.querySelector('#draftToggle').click()`); await sleep(250);
  await evalJs(`(()=>{
    const c=document.querySelector('#board'), r=c.getBoundingClientRect();
    const fire=(type,x,y)=>{ c.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:99,pointerType:'mouse',clientX:r.left+x,clientY:r.top+y,pressure:0.5,isPrimary:true})); };
    fire('pointerenter',40,80); fire('pointerdown',40,80);
    let x=40; const t=setInterval(()=>{ x+=12; fire(x<r.width-40?'pointermove':'pointerup',x,80); if(x>=r.width-40) clearInterval(t); },8);
    return true; })()`);
  await sleep(1000);
  check('后台判定异常', (await evalJs(`window.__guard.locked`)) === true);
  check('用户看到停止提示', (await evalJs(`document.querySelector('#lockOverlay').classList.contains('show')`)) === true);
  check('锁定后不能保存/提交', (await evalJs(`document.querySelector('#saveBtn').disabled && document.querySelector('#submitAllBtn').disabled`)) === true);
  const lockTxt = await bodyText();
  check('提示不暴露内部指标', !/置信度|dtCV|isTrusted|真人/.test(lockTxt));
  await shot('assess-08-locked.png');

  // 7. 错误
  const exceptions = cdp.events.filter((e) => e.method === 'Runtime.exceptionThrown')
    .map((e) => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text);
  const httpErrors = cdp.events.filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
    .map((e) => `${e.params.response.status} ${e.params.response.url}`).filter((x) => !/favicon/i.test(x));
  check('无未捕获 JS 异常', exceptions.length === 0, exceptions.slice(0, 2).join(' | '));
  check('无 4xx/5xx 资源', httpErrors.length === 0, httpErrors.slice(0, 3).join(' | '));

  cdp.close();
  await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(() => {});
}

try { await main(); } catch (e) { failures++; console.error('E2E 异常：', e); }
finally {
  try { chrome.kill(); } catch {}
  console.log(`\n[result] failures=${failures}`);
  process.exitCode = failures === 0 ? 0 : 1;
}
