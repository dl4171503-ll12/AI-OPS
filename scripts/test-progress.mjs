// 学习表现回传 → 主 Agent 评估 接口验证
const cases = [
  { name: '刚好', lesson: { title: '听力专项 · 第2课', focus: 'listening', pct: 58, correct: 5, total: 8 } },
  { name: '太难', lesson: { title: '阅读 · 第1课', focus: 'reading', pct: 25, correct: 2, total: 8 } },
  { name: '太简单', lesson: { title: '词汇 · 第3课', focus: 'vocabulary', pct: 100, correct: 8, total: 8 } },
];
let failures = 0;
const check = (n, ok, extra) => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} · ${n}${extra ? ' :: ' + extra : ''}`); };

for (const base of ['http://127.0.0.1:918', 'http://127.0.0.1:917']) {
  const tag = base.endsWith('917') ? '917代理' : '918直连';
  for (const c of cases) {
    const r = await fetch(base + '/api/school-progress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson: c.lesson, student: { level: 'L2', lex: 430, ielts: { listen: 3.0, speak: 5.5, read: 3.5, write: 4.5 } }, planWeek: 1 }),
    });
    let d = {}; try { d = await r.json(); } catch {}
    const ev = d.evaluation || {};
    check(`${tag} · ${c.name} 返回 200`, r.status === 200, 'status=' + r.status);
    check(`${tag} · ${c.name} 有评估结论`, ['too-hard', 'just-right', 'too-easy'].includes(ev.fit) && typeof ev.advice === 'string' && ev.advice.length > 0, JSON.stringify(ev).slice(0, 120));
    check(`${tag} · ${c.name} 有微调建议`, ev.adjust && [-1, 0, 1].includes(ev.adjust.difficulty), JSON.stringify(ev.adjust));
  }
}
console.log(`\n[result] failures=${failures}`);
process.exitCode = failures ? 1 : 0;
