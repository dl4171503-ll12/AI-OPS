// 英语单科入学测评 · 浏览器端到端验收（两场景）
// 用 Chrome DevTools Protocol 驱动真实页面：
//   A. 弱学生：一律点第一个选项 / 只写一句话 → 应判初级，且不被硬塞雅思题
//   B. 强学生：按题库正答 + 达标写作/口语 → 应判高级，并触发雅思四单项与"可开始真题"
// 用法：node scripts/e2e-english-exam.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ENGLISH_ITEMS } from '../src/lib/english-assessment.ts';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9333;
const BASE = 'http://127.0.0.1:918';
const OUT = path.resolve('docs/research/e2e');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profileDir = path.join(os.tmpdir(), `ops-e2e-${Date.now()}`);
const results = { scenarios: [], screenshots: [], errors: [] };
let failures = 0;

function check(name, ok, extra) {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${extra ? ' :: ' + extra : ''}`);
  return ok;
}

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function waitChrome() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (r.ok) return await r.json();
    } catch {
      /* retry */
    }
    await sleep(200);
  }
  throw new Error('Chrome 未就绪');
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error('ws error'));
  });
  let seq = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      const { res, rej } = pending.get(d.id);
      pending.delete(d.id);
      if (d.error) rej(new Error(JSON.stringify(d.error)));
      else res(d.result);
    } else if (d.method) events.push(d);
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const id = ++seq;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params }));
    });
  return { send, events, close: () => ws.close() };
}

const STUDENT = {
  id: 'e2e-student-1',
  name: '测试同学',
  avatar: '',
  grade: 'middle',
  gradeYear: 8,
  ageBand: 'mid',
  schoolId: 'e2e-school',
  inviteCode: 'E2E001',
  createdAt: '2026-01-01T00:00:00.000Z',
  studyDays: 1,
  lastStudyDate: '2026-11-10',
  points: 0,
  badges: [],
  decorations: [],
};

/** 强学生答案：客观题给正确答案；开放题按 minWords+targets 生成（和引擎自测一致） */
function strongAnswer(item) {
  if (item.options?.length) return { kind: 'option', text: item.answer };
  const targets = item.targets || [];
  const filler = Array.from({ length: Math.max(item.minWords || 20, 20) }, (_, i) =>
    i % 5 === 4 ? 'because' : 'word',
  ).join(' ');
  return {
    kind: 'text',
    text: `${filler} ${targets.join(' ')}. I think this is right. It is good.`,
  };
}

async function runScenario(cdp, { name, mode, expect }) {
  const evaluate = async (expression) => {
    const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result?.value;
  };
  const text = async () => (await evaluate('document.body.innerText')) || '';
  const waitFor = async (needle, timeout = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if ((await text()).includes(needle)) return true;
      await sleep(250);
    }
    return false;
  };
  const shot = async (file) => {
    const s = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const p = path.join(OUT, file);
    fs.writeFileSync(p, Buffer.from(s.data, 'base64'));
    results.screenshots.push(p);
  };

  console.log(`\n=== 场景 ${name}（${mode}）===`);
  await cdp.send('Page.navigate', { url: `${BASE}/` });
  await sleep(2000);
  await evaluate(`(()=>{
    localStorage.setItem('ai-school-auth-contact','phone:13800138000');
    localStorage.setItem('ai-one-person-school-v1:p:13800138000', JSON.stringify({state:{student:${JSON.stringify(STUDENT)}},version:0}));
    Object.keys(localStorage).filter(k=>k.startsWith('ops-english-exam-v1:')).forEach(k=>localStorage.removeItem(k));
    return true;
  })()`);
  await cdp.send('Page.navigate', { url: `${BASE}/english-exam` });
  await sleep(2500);

  check('进入并渲染四档说明', (await text()).includes('英语入学测评'));
  await evaluate(
    `(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='开始英语测评'); if(b){b.click();return true} return false})()`,
  );
  await sleep(1000);
  check('进入作答站', await waitFor('提交本站', 10000));

  let answers = 0;
  let sawIelts = false;
  let sawSpeakingStation = false;
  const seenItems = [];
  for (let i = 0; i < 40; i++) {
    const body = await text();
    if (body.includes('英语起点')) break;
    if (body.includes('雅思能力判定')) sawIelts = true;
    if (body.includes('开始录音')) sawSpeakingStation = true;

    const meta = await evaluate(`(()=>{const s=document.querySelector('[data-item-id]'); return s?{id:s.dataset.itemId,skill:s.dataset.itemSkill}:'none'})()`);
    if (!meta || meta === 'none') break;
    seenItems.push(`${meta.skill}:${meta.id}`);

    if (mode === 'strong') {
      const item = ENGLISH_ITEMS.find((x) => x.id === meta.id);
      if (!item) {
        check(`题库能查到 ${meta.id}`, false);
        break;
      }
      const ans = strongAnswer(item);
      if (ans.kind === 'option') {
        await evaluate(
          `(()=>{const t=${JSON.stringify(ans.text)};const b=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-pressed')!==null&&x.textContent.trim()===t); if(b){b.click();return true} return false})()`,
        );
      } else {
        await evaluate(`(()=>{
          const ta=document.querySelector('textarea'); if(!ta) return false;
          const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
          set.call(ta, ${JSON.stringify(ans.text)});
          ta.dispatchEvent(new Event('input',{bubbles:true}));
          return true;
        })()`);
      }
    } else {
      await evaluate(`(()=>{
        const opt=[...document.querySelectorAll('button')].filter(b=>b.getAttribute('aria-pressed')!==null);
        if(opt.length){opt[0].click();return 'option';}
        const ta=document.querySelector('textarea');
        if(ta){
          const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
          set.call(ta,'This is my answer because I think it is a good idea. In my opinion it is useful.');
          ta.dispatchEvent(new Event('input',{bubbles:true}));
          return 'text';
        }
        return 'none';
      })()`);
    }
    await sleep(220);
    const submitted = await evaluate(
      `(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='提交本站'); if(b&&!b.disabled){b.click();return true} return false})()`,
    );
    if (submitted) answers++;
    await sleep(380);
  }

  const reportOk = await waitFor('英语起点', 12000);
  check('生成分档报告', reportOk);
  const body = await text();
  const stored = await evaluate(`(()=>{const k=Object.keys(localStorage).find(x=>x.startsWith('ops-english-exam-v1:')); if(!k) return null; const v=JSON.parse(localStorage.getItem(k)); return {overall:v.report?.overallBand, ready:v.report?.ielts?.ready, administered:v.report?.ielts?.administered, items:(v.report?.skills?Object.values(v.report.skills).reduce((n,s)=>n+s.attempted,0):0)}})()`);
  console.log(`  已回答 ${answers} 题；存档 ${JSON.stringify(stored)}`);

  check('报告含四技能', ['口语·说', '听说·听', '读写·读', '读写·写'].every((k) => body.includes(k)));
  check('结果落本机存档', Boolean(stored));
  if (stored) check(`综合档位=${expect.overall}`, stored.overall === expect.overall, stored.overall);
  if (stored) check(`雅思判定 administered=${expect.administered}`, stored.administered === expect.administered, String(stored.administered));
  if (stored && expect.ready !== undefined) check(`雅思 ready=${expect.ready}`, stored.ready === expect.ready, String(stored.ready));
  check(`雅思判定题出现=${expect.sawIelts}`, sawIelts === expect.sawIelts, `sawIelts=${sawIelts}`);
  check('口语站出现开始录音', sawSpeakingStation);
  if (expect.minItems) check(`作答题目数 ≥${expect.minItems}`, stored && stored.items >= expect.minItems, String(stored?.items));

  await shot(`scenario-${mode}-report.png`);
  results.scenarios.push({ name, mode, answers, seenItems, stored, bodyPreview: body.slice(0, 400) });
}

async function main() {
  await waitChrome();
  const target = await (
    await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' })
  ).json();
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  await runScenario(cdp, { name: '弱学生', mode: 'weak', expect: { overall: 'beginner', administered: false, sawIelts: false } });
  await runScenario(cdp, {
    name: '强学生',
    mode: 'strong',
    expect: { overall: 'advanced', administered: true, ready: true, sawIelts: true, minItems: 12 },
  });

  const exceptions = cdp.events
    .filter((e) => e.method === 'Runtime.exceptionThrown')
    .map((e) => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text);
  const httpErrors = cdp.events
    .filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
    .map((e) => `${e.params.response.status} ${e.params.response.url}`)
    .filter((t) => !/favicon/i.test(t));
  check('无未捕获 JS 异常', exceptions.length === 0, exceptions.slice(0, 2).join(' | '));
  check('无 4xx/5xx 资源请求', httpErrors.length === 0, httpErrors.slice(0, 4).join(' | '));
  results.errors = [...exceptions, ...httpErrors];

  cdp.close();
  await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${target.id}`).catch(() => {});
}

try {
  await main();
} catch (e) {
  failures++;
  results.errors.push(String(e));
  console.error('E2E 异常：', e);
} finally {
  try {
    chrome.kill();
  } catch {
    /* ignore */
  }
  fs.writeFileSync(path.join(OUT, 'e2e-result.json'), JSON.stringify(results, null, 2));
  console.log(`\n[result] failures=${failures}`);
  process.exitCode = failures === 0 ? 0 : 1;
}
