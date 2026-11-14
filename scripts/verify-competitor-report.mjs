// 可视化竞品报告 HTML · 独立验收
// 用法：node scripts/verify-competitor-report.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9336;
const PAGE = process.argv[2] || 'http://127.0.0.1:918/competitor-report.html';
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
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${path.join(os.tmpdir(), 'ops-report-' + Date.now())}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function waitChrome() {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error('chrome not ready');
}

async function main() {
  await waitChrome();
  const target = await (
    await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' })
  ).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error('ws'));
  });
  let seq = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      const { res, rej } = pending.get(d.id);
      pending.delete(d.id);
      d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result);
    } else if (d.method) events.push(d);
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const id = ++seq;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result?.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: PAGE });
  await sleep(1800);

  const title = await evalJs('document.title');
  check('页面标题存在', Boolean(title), title);

  const text = await evalJs('document.body.innerText');
  check('正文长度 > 6000 字', (text || '').length > 6000, 'len=' + (text || '').length);

  const need = ['摘要', '定价', '定位', '时间线', '吸取'];
  for (const k of need) check(`包含章节关键词「${k}」`, text.includes(k));

  const svgCount = await evalJs(`document.querySelectorAll('svg').length`);
  const figCount = await evalJs(`document.querySelectorAll('.fno').length`);
  const barRows = await evalJs(`document.querySelectorAll('.bc-track, .bc-row, [class*=heat], [class*=scatter]').length`);
  // 图表允许 SVG 或纯 CSS 实现
  check('图表数量 ≥ 5（SVG 或 CSS）', figCount >= 5 || svgCount >= 5, `fig=${figCount} svg=${svgCount} barRows=${barRows}`);

  const imgs = await evalJs(`[...document.images].filter(i=>i.src && !i.src.startsWith('data:')).length`);
  check('不依赖外部图片', imgs === 0, 'externalImgs=' + imgs);
  const ext = await evalJs(`[...document.querySelectorAll('link[href],script[src]')].map(e=>e.href||e.src).filter(u=>u && !u.startsWith('data:'))`);
  check('无外部 CSS/JS 依赖', ext.length === 0, ext.slice(0, 3).join(' | '));

  const bad = ['TODO', '待补充', '占位', 'undefined', 'NaN'];
  const hits = bad.filter((b) => (text || '').includes(b));
  check('无占位/TODO/NaN', hits.length === 0, hits.join(','));

  // 关键数字抽查（应出现在正文）
  const nums = [
    { k: '$65', label: 'DET $65/次' },
    { k: '$8', label: 'Amira $8/学生/年' },
    { k: '6.1', label: 'Khanmigo +6.1%' },
  ];
  for (const n of nums) check(`关键数据「${n.label}」在正文中`, text.includes(n.k));
  check('提到认知投入指标', text.includes('认知投入'));

  // 滚动截图
  const shots = [];
  const totalH = await evalJs('document.body.scrollHeight');
  const viewH = 1000;
  const pages = Math.min(4, Math.max(1, Math.ceil(totalH / viewH)));
  for (let i = 0; i < pages; i++) {
    await evalJs(`window.scrollTo(0, ${i * viewH})`);
    await sleep(350);
    const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const p = path.join(OUT, `report-${String(i + 1).padStart(2, '0')}.png`);
    fs.writeFileSync(p, Buffer.from(s.data, 'base64'));
    shots.push(p);
    console.log(`  screenshot -> ${p}`);
  }
  console.log(`  页面高度 ${totalH}px，截了 ${pages} 屏`);

  const exceptions = events
    .filter((e) => e.method === 'Runtime.exceptionThrown')
    .map((e) => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text);
  const httpErrors = events
    .filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
    .map((e) => `${e.params.response.status} ${e.params.response.url}`)
    .filter((x) => !/favicon/i.test(x));
  check('无未捕获 JS 异常', exceptions.length === 0, exceptions.slice(0, 2).join(' | '));
  check('无 4xx/5xx 资源', httpErrors.length === 0, httpErrors.slice(0, 3).join(' | '));

  ws.close();
  await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(() => {});
}

try {
  await main();
} catch (e) {
  failures++;
  console.error('验收异常：', e);
} finally {
  try {
    chrome.kill();
  } catch {}
  console.log(`\n[result] failures=${failures}`);
  process.exitCode = failures === 0 ? 0 : 1;
}
