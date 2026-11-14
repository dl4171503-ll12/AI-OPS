// 校验"扩展阅读题库"（public/items/reading-extra-*.json）
// 用法：node scripts/validate-extra-reading.mjs public/items/reading-extra-low.json
import fs from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('用法: node scripts/validate-extra-reading.mjs <file>'); process.exit(2); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const list = data.passages || [];
const errors = [], warns = [];

const pos = [0, 0, 0];
let mcq = 0;

if (list.length < 8) errors.push(`文章数量 ${list.length} < 8（阶梯需要充足篇目）`);

const ids = new Set();
list.forEach((p, i) => {
  const tag = `passages[${i}]${p.id ? '(' + p.id + ')' : ''}`;
  if (!p.id) errors.push(`${tag}: 缺 id`);
  if (ids.has(p.id)) errors.push(`${tag}: id 重复`);
  ids.add(p.id);

  if (typeof p.lex !== 'number' || p.lex < 100 || p.lex > 1600)
    errors.push(`${tag}: lex 必须是 100–1600 的数字`);
  if (!p.source || String(p.source).trim().length < 4) errors.push(`${tag}: 缺 source（语料出处）`);
  if (!p.passage || String(p.passage).trim().length < 60) errors.push(`${tag}: 正文过短（<60 字符）`);
  else {
    const words = String(p.passage).trim().split(/\s+/).length;
    if (words < 30) errors.push(`${tag}: 正文词数 ${words} 太少`);
    // 粗略难度提示：词数/句长与 lex 的合理范围（软检查）
    if (p.lex <= 400 && words > 160) warns.push(`${tag}: lex ${p.lex} 但 ${words} 词，可能偏长`);
    if (p.lex >= 1000 && words < 110) warns.push(`${tag}: lex ${p.lex} 但 ${words} 词，可能偏短`);
  }

  if (!Array.isArray(p.questions) || p.questions.length !== 4)
    errors.push(`${tag}: 必须恰好 4 个问题`);
  (p.questions || []).forEach((q, j) => {
    const qt = `${tag}.q${j + 1}`;
    if (!q.q) errors.push(`${qt}: 缺题干`);
    if (!Array.isArray(q.options) || q.options.length !== 3) errors.push(`${qt}: 需 3 个选项`);
    else {
      if (new Set(q.options).size !== 3) errors.push(`${qt}: 选项重复`);
      const idx = q.options.indexOf(q.answer);
      if (idx < 0) errors.push(`${qt}: answer 不在选项中`);
      else { pos[idx]++; mcq++; }
    }
  });

  // 低龄（<700L）必须有中文支持
  if (p.lex < 700) {
    if (!p.zh || !p.zh.summary) errors.push(`${tag}: <700L 必须提供 zh.summary（中文提示）`);
    if (!p.zh || !Array.isArray(p.zh.q) || p.zh.q.length !== 4)
      errors.push(`${tag}: <700L 必须提供 zh.q（4 条中文题意）`);
    if (!p.illus) warns.push(`${tag}: <700L 建议提供 illus（插画 emoji）`);
  }
});

if (mcq > 0) {
  const maxShare = Math.max(...pos) / mcq;
  if (maxShare > 0.45)
    errors.push(`答案位置过度集中：1/2/3 位 = ${pos.join('/')}，最大占比 ${Math.round(maxShare * 100)}% > 45%`);
}

console.log(`文件: ${file}`);
console.log(`文章: ${list.length} 篇 · 题目: ${mcq} 题 · 答案位置 1/2/3 = ${pos.join('/')}`);
console.log(`lex 范围: ${Math.min(...list.map(p => p.lex))} – ${Math.max(...list.map(p => p.lex))}`);
if (warns.length) console.log('提示:\n  ' + warns.join('\n  '));
if (errors.length) { console.error('\n❌ 校验失败:'); errors.forEach(e => console.error('  - ' + e)); process.exit(1); }
console.log('\n✅ 校验通过');
