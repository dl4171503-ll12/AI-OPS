// 生成"合成题库"用于 UI 冒烟测试（不是真实题目！仅用于验证流程/图表）
// 用法：node scripts/make-synthetic-bank.mjs [--out docs/research/items-synthetic]
import fs from 'node:fs';
import path from 'node:path';

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : def;
}
const OUT = arg('out', 'docs/research/items-synthetic');
fs.mkdirSync(OUT, { recursive: true });

const LEVELS = {
  beginner: { cefr: 'A1', grade: '小学 1–3 年级' },
  intermediate: { cefr: 'A2', grade: '小学 4–6 年级' },
  'ielts-prep': { cefr: 'B1', grade: '初一 – 初三' },
  advanced: { cefr: 'B2', grade: '雅思初阶段' },
};

// 难度分层：12/9/(6段×2)/(2篇×4)/4/4 = 49
function tierFor(i, n) {
  if (i < Math.ceil(n / 3)) return 1;
  if (i < Math.ceil((n * 2) / 3)) return 2;
  return 3;
}

for (const [lvl, meta] of Object.entries(LEVELS)) {
  const items = { vocab: [], grammar: [], listening: [], reading: [], speaking: [], writing: [] };
  for (let i = 0; i < 12; i++) {
    items.vocab.push({
      id: `${lvl}-v${i + 1}`, tier: tierFor(i, 12),
      sentence: `Synthetic vocabulary item ${i + 1}: choose the word.`,
      options: ['alpha', 'beta', 'gamma'], answer: 'alpha', focus: 'synthetic',
    });
  }
  for (let i = 0; i < 9; i++) {
    items.grammar.push({
      id: `${lvl}-g${i + 1}`, tier: tierFor(i, 9),
      sentence: `Synthetic grammar item ${i + 1}: ___ .`,
      options: ['is', 'are', 'am'], answer: 'is', focus: 'synthetic',
    });
  }
  for (let u = 0; u < 6; u++) {
    items.listening.push({
      id: `${lvl}-l${u + 1}`, tier: tierFor(u, 6),
      script: `Synthetic listening script ${u + 1}. This is a placeholder for UI testing.`,
      questions: [
        { q: `Synthetic listening Q${u + 1}.1`, options: ['A', 'B', 'C'], answer: 'A' },
        { q: `Synthetic listening Q${u + 1}.2`, options: ['A', 'B', 'C'], answer: 'B' },
      ],
    });
  }
  for (let r = 0; r < 2; r++) {
    items.reading.push({
      id: `${lvl}-r${r + 1}`, tier: tierFor(r, 2), source: 'synthetic placeholder',
      passage: `Synthetic reading passage ${r + 1}. Placeholder text for UI testing only.`,
      questions: [1, 2, 3, 4].map((k) => ({ q: `Synthetic reading Q${r + 1}.${k}`, options: ['A', 'B', 'C'], answer: 'A' })),
    });
  }
  for (let i = 0; i < 4; i++) {
    items.speaking.push({ id: `${lvl}-s${i + 1}`, tier: tierFor(i, 4), prompt: `Synthetic speaking prompt ${i + 1}.`, minWords: 20, targets: ['because'] });
  }
  for (let i = 0; i < 4; i++) {
    items.writing.push({ id: `${lvl}-w${i + 1}`, tier: tierFor(i, 4), prompt: `Synthetic writing prompt ${i + 1}. (20+ words)`, minWords: 20 });
  }
  const data = { level: lvl, cefr: meta.cefr, grade: meta.grade, synthetic: true, items };
  fs.writeFileSync(path.join(OUT, `${lvl}.json`), JSON.stringify(data, null, 2));
}
console.log(`✅ 合成题库已写入 ${OUT}（仅用于 UI 冒烟测试，非真实题目）`);
