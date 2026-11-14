// AI 老师课堂验收：接口 + 课堂页
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9451;
const BASE = 'http://127.0.0.1:917';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (n, ok, extra) => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} · ${n}${extra ? ' :: ' + extra : ''}`); };

// 1. 接口
for (const mode of ['start', 'reply', 'feedback']) {
  const body = { mode, profile: { grade: '小学三年级', level: 'L2', lex: 430, ielts: { listen: 3, speak: 3.5, read: 3.5, write: 3 }, weakest: '听力' }, lesson: { title: '第 1 章 · 认识与问候', focus: 'vocabulary', question: '选出正确的单词：书包' }, studentText: 'bag', expected: 'bag', correct: 4, total: 5 };
  const r = await fetch(BASE + '/api/school-tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let d = {}; try { d = await r.json(); } catch {}
  check(`老师接口 ${mode} 200`, r.status === 200, 'status=' + r.status);
  check(`老师接口 ${mode} 有回复`, !!(d.ok && d.reply && d.reply.length > 5), (d.reply || '').slice(0, 60));
}

// 2. 课堂页
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-allow-origins=*',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(os.tmpdir(), 'ops-tutor-' + Date.now())}`, 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {} await sleep(200); }
const tg = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tg.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0; const pending = new Map(); const events = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const { r, j } = pending.get(d.id); pending.delete(d.id); d.error ? j(new Error(JSON.stringify(d.error))) : r(d.result); } else if (d.method) events.push(d); };
const send = (method, params = {}) => new Promise((r, j) => { const id = ++seq; pending.set(id, { r, j }); ws.send(JSON.stringify({ id, method, params })); });
for (const m of ['Page.enable', 'Runtime.enable']) await send(m);
const evalJs = async (e, ms = 15000) => { const p = send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); const t = new Promise((_, j) => setTimeout(() => j(new Error('eval timeout')), ms)); const r = await Promise.race([p, t]); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result?.value; };

await send('Page.navigate', { url: BASE + '/tutor.html' }); await sleep(1400);
await evalJs('window.alert=()=>{};true');
check('课堂页加载', /AI 老师课堂/.test(await evalJs('document.title')));
check('有老师提示语', /Hi! I'm your English teacher/.test(await evalJs(`document.querySelector('#chat').innerText`)));
const startClass = async () => { await evalJs(`document.querySelector('#startBtn').click()`); await sleep(300); await evalJs(`(()=>{const b=document.querySelector('#humanBox');if(b){b.checked=true;b.dispatchEvent(new Event('change'));}return true})()`); await sleep(1600); };
await evalJs("localStorage.setItem('ops917-min-minutes','0');true");
await startClass();
await sleep(4500);
const chat1 = await evalJs(`document.querySelector('#chat').innerText`);
check('开始后老师用英文出题', chat1.length > 80 && /answer|say|tell|name|question|practise|practice/i.test(chat1), chat1.slice(-120));
const enabled = await evalJs(`!document.querySelector('#answer').disabled`);
check('输入框已启用', enabled === true);
check('有语音回答按钮', (await evalJs(`!!document.querySelector('#micBtn')`)) === true);
check('有"听不懂"按钮', (await evalJs(`!!document.querySelector('#giveUpBtn')`)) === true);
check('有老师自动朗读开关', (await evalJs(`!!document.querySelector('#autoSpeak')`)) === true);
check('有麦克风测试按钮', (await evalJs(`!!document.querySelector('#micTestBtn')`)) === true);
check('页面是安全环境（127.0.0.1）', (await evalJs('window.isSecureContext')) === true);
check('麦克风诊断：被拦截提示', /浏览器拦截/.test(await evalJs(`window.__micHint({name:'NotAllowedError'})`)));
check('麦克风诊断：无设备提示', /没有检测到麦克风/.test(await evalJs(`window.__micHint({name:'NotFoundError'})`)));
check('麦克风诊断：被占用提示', /其他程序占用/.test(await evalJs(`window.__micHint({name:'NotReadableError'})`)));
await evalJs(`document.querySelector('#micBtn').click()`);
await sleep(1200);
const micHelp = await evalJs(`document.querySelector('#micHelp').style.display`);
check('点说话失败时给出可操作提示', micHelp === 'block', 'display=' + micHelp);
// 点"听不懂"：老师应简化重说且不推进
const beforeIdx = await evalJs(`window.__lessonDebug ? 1 : 0`).catch(()=>0);
const chatBefore = await evalJs(`document.querySelector('#chat').innerText`);
await evalJs(`document.querySelector('#giveUpBtn').click()`);
await sleep(3500);
const chatAfter = await evalJs(`document.querySelector('#chat').innerText`);
check('点"听不懂"后老师简化重说', chatAfter.length > chatBefore.length, 'len ' + chatBefore.length + ' -> ' + chatAfter.length);
check('有语速选择（偏慢/正常/偏快）', (await evalJs(`document.querySelectorAll('#speedSel option').length`)) === 3);
await evalJs(`(()=>{const s=document.querySelector('#speedSel');s.value='slow';s.dispatchEvent(new Event('change'));document.querySelector('.say')?document.querySelector('.say').click():0;return true})()`);
await sleep(400);
check('偏慢语速生效', (await evalJs(`window.__lastTtsSpeed`)) === 0.75, 'speed=' + await evalJs(`window.__lastTtsSpeed`));
await evalJs(`(()=>{const s=document.querySelector('#speedSel');s.value='fast';s.dispatchEvent(new Event('change'));document.querySelector('.say')?document.querySelector('.say').click():0;return true})()`);
await sleep(400);
check('偏快语速生效', (await evalJs(`window.__lastTtsSpeed`)) === 1.15, 'speed=' + await evalJs(`window.__lastTtsSpeed`));
await evalJs(`(()=>{const s=document.querySelector('#speedSel');s.value='normal';s.dispatchEvent(new Event('change'));return true})()`);
const ttsBefore = await evalJs(`(window.__ttsCalls||0)`);
await evalJs(`(()=>{const i=document.querySelector('#answer');i.value='Tom';i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#sendBtn').click();return true})()`);
await sleep(3500);
const chat2 = await evalJs(`document.querySelector('#chat').innerText`);
const ttsAfter = await evalJs(`(window.__ttsCalls||0)`);
check('学生回答后老师有英文反馈', chat2.length > chat1.length && /great|good|correct|say|name|again|almost|now|question|answer|try/i.test(chat2.slice(-260)), chat2.slice(-120));
check('一次回答只新增一段朗读', ttsAfter - ttsBefore === 1, `tts ${ttsBefore} -> ${ttsAfter}`);
check('不再额外插一条“下一题”', !/^\s*Next:/m.test(chat2));
// 撤回：应删除刚才的学生消息+老师回复，并把文字放回输入框
const msgBeforeUndo = await evalJs(`document.querySelectorAll('#chat .msg').length`);
await evalJs(`document.querySelector('#undoBtn').click()`);
await sleep(600);
const msgAfterUndo = await evalJs(`document.querySelectorAll('#chat .msg').length`);
const inputAfterUndo = await evalJs(`document.querySelector('#answer').value`);
check('撤回后问答两条一起消失', msgAfterUndo <= msgBeforeUndo - 2, `msgs ${msgBeforeUndo} -> ${msgAfterUndo}`);
check('撤回后文字回到输入框', inputAfterUndo === 'Tom', 'input=' + inputAfterUndo);
check('撤回会停止老师语音', (await evalJs(`window.__ttsCancelled||0`)) > 0, 'cancelled=' + await evalJs(`window.__ttsCancelled||0`));
await evalJs(`document.querySelector('#sendBtn').click()`);
await sleep(3000);
const msgAfterResend = await evalJs(`document.querySelectorAll('#chat .msg').length`);
check('撤回后可重新发送', msgAfterResend > msgAfterUndo, `msgs ${msgAfterUndo} -> ${msgAfterResend}`);
// 纠错后重说
await evalJs(`(()=>{const i=document.querySelector('#answer');i.value='His name is Tom.';i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#sendBtn').click();return true})()`);
await sleep(3500);
const chat3 = await evalJs(`document.querySelector('#chat').innerText`);
check('重说后老师继续推进', chat3.length > chat2.length, 'len ' + chat2.length + ' -> ' + chat3.length);
// 学生不能自己结束课程
const endHidden = await evalJs(`(()=>{const b=document.querySelector('#endBtn');return !b || getComputedStyle(b).display==='none'})()`);
check('学生没有结束课程按钮', endHidden === true);
const exportDisabled = await evalJs(`document.querySelector('#exportSupBtn').disabled`);
check('未学完不能导出监督记录', exportDisabled === true);
const exc = events.filter(e => e.method === 'Runtime.exceptionThrown').map(e => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text).filter(x => !/favicon/.test(x || ''));
check('无 JS 异常', exc.length === 0, exc.slice(0, 1).join(''));

chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode = failures ? 1 : 0;
