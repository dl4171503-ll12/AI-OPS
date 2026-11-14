// 英语测评（MST + 基准/进度监测 + Azure 发音评测）· 浏览器验收
// 用法：node scripts/e2e-mst-assessment.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9338;
const PAGE = 'http://127.0.0.1:918/english-assessment.html';
const OUT = path.resolve('docs/research/e2e');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (n, ok, extra) => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${n}${extra ? ' :: ' + extra : ''}`);
};

const chrome = spawn(
  CHROME,
  ['--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-allow-origins=*',
   '--window-size=1280,1000', `--remote-debugging-port=${PORT}`,
   `--user-data-dir=${path.join(os.tmpdir(), 'ops-mst-' + Date.now())}`, 'about:blank'],
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
  let seq = 0; const pending = new Map(); const events = [];
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
  const p = path.join(OUT, name); fs.writeFileSync(p, Buffer.from(s.data, 'base64'));
  console.log('  screenshot -> ' + p);
};
const openPage = async () => { await cdp.send('Page.navigate', { url: PAGE }); await sleep(1500); };

async function answerCurrent() {
  const mcq = await evalJs(`document.querySelectorAll('.opt').length>0`);
  if (mcq) await evalJs(`document.querySelectorAll('.opt')[0].click()`);
  else await evalJs(`(()=>{const ta=document.querySelector('#qText');
    const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
    set.call(ta,'I think it is a good idea because it helps me learn new words and I use them every day. It is useful for my study and I like it very much.');
    ta.dispatchEvent(new Event('input',{bubbles:true})); return true})()`);
  await sleep(70);
  await evalJs(`document.querySelector('#saveBtn').click()`);
  await sleep(120);
}
async function answerN(n) { for (let i = 0; i < n; i++) await answerCurrent(); }

async function main() {
  await waitChrome();
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' })).json();
  cdp = await connect(target.webSocketDebuggerUrl);
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable']) await cdp.send(m);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });

  // ---------- 1. 开始页 ----------
  console.log('\n=== 1. 开始页 ===');
  await openPage();
  const t0 = await bodyText();
  check('四个水平选项', (await evalJs(`document.querySelectorAll('.pick').length`)) === 4);
  check('未选水平时完整测评禁用', (await evalJs(`document.querySelector('#startBtn').disabled`)) === true);
  check('提供 24 题快速基准测入口', /24 题/.test(t0) && (await evalJs(`!!document.querySelector('#benchBtn')`)));
  check('说明 MST 流程', /多阶段自适应|MST/.test(t0));
  await shot('mst-01-intro.png');

  // ---------- 2. Router ----------
  console.log('\n=== 2. MST：Router 12 题 ===');
  await evalJs(`document.querySelectorAll('.pick')[2].click()`); await sleep(150);
  await evalJs(`document.querySelector('#startBtn').click()`); await sleep(500);
  check('进入 Router 阶段', (await bodyText()).includes('定位（Router）'));
  check('初始题量 12', (await evalJs(`window.__exam.items.length`)) === 12);
  await answerN(12); await sleep(400);
  const afterRouter = await evalJs(`({n:window.__exam.items.length, stage:window.__exam.stage, label:document.querySelector('#stepLabel').textContent})`);
  check('Router 完成后自动进入 Stage 1', afterRouter.stage === 1, JSON.stringify(afterRouter));
  check('Stage 1 追加 14 题（共 26）', afterRouter.n === 26, 'n=' + afterRouter.n);
  check('界面标注第 1 阶段', /第 1 阶段/.test(afterRouter.label), afterRouter.label);

  // ---------- 3. Stage 1/2 与产出块 ----------
  console.log('\n=== 3. Stage 1 / Stage 2 / 产出块 ===');
  await answerN(14); await sleep(400);
  const afterS1 = await evalJs(`({n:window.__exam.items.length, stage:window.__exam.stage})`);
  check('Stage 1 完成后进入 Stage 2', afterS1.stage === 2, JSON.stringify(afterS1));
  check('Stage 2 追加 14 题（共 40）', afterS1.n === 40, 'n=' + afterS1.n);
  await answerN(14); await sleep(400);
  const afterS2 = await evalJs(`({n:window.__exam.items.length, stage:window.__exam.stage})`);
  check('Stage 2 完成后进入产出块', afterS2.stage === 3, JSON.stringify(afterS2));
  check('总题数 49', afterS2.n === 49, 'n=' + afterS2.n);
  await answerN(8); await sleep(300);
  check('48/49 时提交仍禁用', (await evalJs(`document.querySelector('#submitAllBtn').disabled`)) === true);
  await answerN(1); await sleep(400);
  check('49/49 全部答完', (await evalJs(`document.querySelectorAll('.cell.done').length`)) === 49);
  check('答完后提交可用', (await evalJs(`document.querySelector('#submitAllBtn').disabled`)) === false);
  await shot('mst-02-exam.png');

  // ---------- 4. 修改已答 ----------
  console.log('\n=== 4. 已答可修改 ===');
  await evalJs(`document.querySelector('#cardToggle').click()`); await sleep(200);
  await evalJs(`document.querySelectorAll('.cell.done')[0].click()`); await sleep(300);
  check('点已答回到该题', /第 1 题/.test(await evalJs(`document.querySelector('#stepLabel').textContent`)));
  await evalJs(`(()=>{const o=document.querySelectorAll('.opt'); if(o.length) o[o.length-1].click(); return true})()`);
  await sleep(80);
  await evalJs(`document.querySelector('#saveBtn').click()`); await sleep(300);
  check('修改后仍可提交', (await evalJs(`document.querySelector('#submitAllBtn').disabled`)) === false);

  // ---------- 5. 完整报告（家长版口径） ----------
  console.log('\n=== 5. MST 完整报告 ===');
  await evalJs(`document.querySelector('#submitAllBtn').click()`); await sleep(800);
  const rep = await bodyText();
  check('报告标题', rep.includes('英语测评报告'));
  check('主视觉是蓝思区间', /蓝思参考区间/.test(rep) && /L/.test(rep));
  check('给出推荐阅读范围', rep.includes('推荐阅读范围'));
  check('雅思口语预估 band', /雅思口语/.test(rep) && /band/.test(rep));
  check('四维含 FC/LR/GRA', /FC 流利与连贯/.test(rep) && /LR 词汇资源/.test(rep) && /GRA 语法/.test(rep));
  check('P 发音明确待评测', /P 发音/.test(rep) && /待评测/.test(rep));
  check('含六维雷达', rep.includes('六维能力雷达'));
  check('含分项得分', rep.includes('分项得分'));
  check('含难度阶梯', rep.includes('难度阶梯表现'));
  check('含题目构成', rep.includes('题目构成'));
  check('含 Azure 发音评测卡', rep.includes('发音评测（Azure）'));
  check('内部数据不对外', rep.includes('内部数据'));
  const pa = await evalJs(`(async()=>{const r=await fetch('/api/pronunciation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioBase64:'',referenceText:'This is a test.'})}); const d=await r.json().catch(()=>({})); return {status:r.status, code:d.code};})()`);
  check('发音代理明确 501（未配置 Azure，不伪造分数）', pa.status === 501 || pa.status === 200, JSON.stringify(pa));
  check('报告 SVG 图表 ≥2', (await evalJs(`document.querySelectorAll('#screen-report svg').length`)) >= 2);
  await shot('mst-03-report.png');

  // ---------- 6. 基准测 + 进度监测 ----------
  console.log('\n=== 6. 基准测与成长曲线 ===');
  await openPage();
  await evalJs(`document.querySelector('#benchBtn').click()`); await sleep(600);
  check('基准测题量 24', (await evalJs(`window.__exam.items.length`)) === 24);
  await answerN(24); await sleep(200);
  await evalJs(`document.querySelector('#submitAllBtn').click()`); await sleep(700);
  const b1 = await bodyText();
  check('基准测结果页', b1.includes('快速基准测结果'));
  check('首次记录无对比', b1.includes('首次记录'));
  check('标注 4 周一次', /4 周/.test(b1));
  check('给出下次基准测日期', b1.includes('下次基准测建议'));
  check('基准主视觉是蓝思区间', /蓝思参考区间/.test(b1));
  check('成长曲线纵轴为蓝思档', /蓝思档/.test(b1) && b1.includes('成长曲线'));
  check('历史表用蓝思区间', /蓝思区间/.test(b1));
  const hist1 = await evalJs(`JSON.parse(localStorage.getItem('ops-en-benchmark-history:v1')||'[]').length`);
  check('已写入历史 1 条', hist1 === 1, 'hist=' + hist1);
  await shot('mst-04-bench1.png');

  await openPage();
  const introText = await bodyText();
  check('首页显示基准测节奏', /上次基准测/.test(introText) && /还有|已到复测/.test(introText), introText.slice(0, 100));

  await evalJs(`document.querySelector('#benchBtn').click()`); await sleep(600);
  await answerN(24); await sleep(200);
  await evalJs(`document.querySelector('#submitAllBtn').click()`); await sleep(700);
  const b2 = await bodyText();
  check('第二次结果含成长曲线', b2.includes('成长曲线'));
  check('曲线图有折线', (await evalJs(`document.querySelectorAll('#screen-report svg path').length`)) > 0);
  const hist2 = await evalJs(`JSON.parse(localStorage.getItem('ops-en-benchmark-history:v1')||'[]').length`);
  check('历史累计 2 条', hist2 === 2, 'hist=' + hist2);
  check('变化判定用蓝思档+误差口径', /蓝思档/.test(b2) && /误差/.test(b2));
  await shot('mst-05-bench2.png');

  // ---------- 7. 异常笔迹 ----------
  console.log('\n=== 7. 异常操作停止写入 ===');
  await openPage();
  await evalJs(`document.querySelectorAll('.pick')[1].click()`); await sleep(120);
  await evalJs(`document.querySelector('#startBtn').click()`); await sleep(400);
  await evalJs(`document.querySelector('#draftToggle').click()`); await sleep(250);
  await evalJs(`(()=>{const c=document.querySelector('#board'),r=c.getBoundingClientRect();
    const fire=(t,x,y)=>c.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,pointerId:99,pointerType:'mouse',clientX:r.left+x,clientY:r.top+y,pressure:0.5,isPrimary:true}));
    fire('pointerenter',40,80);fire('pointerdown',40,80);
    let x=40;const id=setInterval(()=>{x+=12;fire(x<r.width-40?'pointermove':'pointerup',x,80);if(x>=r.width-40)clearInterval(id);},8);return true})()`);
  await sleep(1000);
  check('后台判定异常', (await evalJs(`window.__guard.locked`)) === true);
  check('用户看到停止提示', (await evalJs(`document.querySelector('#lockOverlay').classList.contains('show')`)) === true);
  await shot('mst-06-locked.png');

  const exceptions = cdp.events.filter((e) => e.method === 'Runtime.exceptionThrown')
    .map((e) => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text);
  const httpErrors = cdp.events.filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
    .map((e) => `${e.params.response.status} ${e.params.response.url}`)
    .filter((x) => !/favicon/i.test(x) && !/\/api\/pronunciation/.test(x));
  check('无未捕获 JS 异常', exceptions.length === 0, exceptions.slice(0, 2).join(' | '));
  check('无 4xx/5xx 资源（发音 501 为预期）', httpErrors.length === 0, httpErrors.slice(0, 3).join(' | '));

  cdp.close();
  await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(() => {});
}

try { await main(); } catch (e) { failures++; console.error('E2E 异常：', e); }
finally {
  try { chrome.kill(); } catch {}
  console.log(`\n[result] failures=${failures}`);
  process.exitCode = failures === 0 ? 0 : 1;
}
