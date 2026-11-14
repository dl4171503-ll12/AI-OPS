// 本地缓存验证（不访问 918 页面，只用临时副本 file://）
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9361;
const src = path.resolve('public/english-assessment.html');
const tmpDir = path.join(os.tmpdir(), 'ops-persist-test-' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });
const page = path.join(tmpDir, 'assessment.html');
fs.copyFileSync(src, page);
const URL_ = 'file:///' + page.replace(/\\/g, '/');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (n, ok, extra) => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} · ${n}${extra ? ' :: ' + extra : ''}`); };

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-allow-origins=*', '--window-size=1280,1000', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${path.join(tmpDir, 'profile')}`, 'about:blank'], { stdio: 'ignore' });

async function waitChrome() { for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return; } catch {} await sleep(200); } throw new Error('chrome not ready'); }

let send;
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws')); });
  let seq = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } };
  send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
}
const evalJs = async (expression, ms = 15000) => {
  const p = send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  const t = new Promise((_, rej) => setTimeout(() => rej(new Error('eval timeout')), ms));
  const r = await Promise.race([p, t]);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result?.value;
};

await waitChrome();
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
await connect(target.webSocketDebuggerUrl);
for (const m of ['Page.enable', 'Runtime.enable']) await send(m);
const open = async () => { await send('Page.navigate', { url: URL_ }); await sleep(1200); await evalJs('window.alert=()=>{};true'); };

await open();
check('页面加载', (await evalJs('document.title')).includes('英语测评'));
// 开始测评并答完第一段
await evalJs(`(()=>{const g=document.querySelectorAll('.pick');g[0].click();document.querySelector('#startBtn').click();return true})()`);
await sleep(400);
check('进入阅读', (await evalJs(`!document.querySelector('#screen-read').classList.contains('hidden')`)) === true);
await evalJs(`(()=>{for(const b of document.querySelectorAll('#readQuestions .qblock')){const o=b.querySelector('.opt');if(o)o.click()}return true})()`);
await sleep(150);
await evalJs(`document.querySelector('#readSubmit').click()`);
await sleep(400);
const before = await evalJs(`(()=>{const s=window.__exam.snapshot();return {passage:s.passageId,admin:s.admin.length,round:s.round,sec:s.sec};})()`);
check('第一段已提交并进入第 2 段', before.admin === 1 && before.round === 1, JSON.stringify(before));
const saved = await evalJs(`!!localStorage.getItem('ops-en-exam-progress:v1')`);
check('进度已写入 localStorage', saved === true);

// 模拟刷新
await open();
const banner = await evalJs(`!!document.querySelector('#resumeBtn')`);
check('刷新后出现"继续上次测评"', banner === true);
if (banner) {
  await evalJs(`document.querySelector('#resumeBtn').click()`);
  await sleep(500);
  const after = await evalJs(`(()=>{const s=window.__exam.snapshot();return {passage:s.passageId,admin:s.admin.length,round:s.round,sec:s.sec,visible:!document.querySelector('#screen-read').classList.contains('hidden')};})()`);
  check('恢复后进度一致', after.admin === before.admin && after.passage === before.passage && after.round === before.round, JSON.stringify(after));
  check('恢复后回到阅读区', after.visible === true);
}

// 历史记录区域（空时应不渲染）
const hist = await evalJs(`document.body.innerText.includes('历史测评记录')`);
check('无历史时不显示历史区', hist === false);

chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode = failures ? 1 : 0;
