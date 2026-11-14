// 生成 917 学习站点的课程数据：5 单元 × 5 章节 × 5 小节，题目池来自现有题库
// 用法：node scripts/build-curriculum.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'site917/public/data/curriculum.json');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const LEVELS = [
  { unit: 1, level: 'L1', name: 'L1 入门', lex: 'BR–400L', bank: 'beginner' },
  { unit: 2, level: 'L2', name: 'L2 基础', lex: '400L–700L', bank: 'intermediate' },
  { unit: 3, level: 'L3', name: 'L3 进阶', lex: '700L–1000L', bank: 'ielts-prep' },
  { unit: 4, level: 'L4', name: 'L4 熟练', lex: '1000L–1300L', bank: 'advanced' },
  { unit: 5, level: 'L5', name: 'L5 高阶', lex: '1300L–1600L', bank: 'advanced' },
];

const CHAPTERS = ['认识与问候', '家庭与朋友', '学校与日常', '爱好与运动', '复习与小测'];
const SKILLS = ['vocab', 'grammar', 'listening', 'reading', 'dictation', 'speaking', 'writing'];

const DICTATION = {
  beginner: ['I have a red bag.', 'My mother likes apples.', 'The cat is under the table.', 'We go to school by bus.'],
  intermediate: ['Tom usually gets up at seven o’clock.', 'She is going to visit her grandmother next week.', 'The library is next to the post office.', 'We should drink enough water every day.'],
  'ielts-prep': ['Many students find it difficult to balance study and rest.', 'The number of people living in cities has increased rapidly.', 'Although the weather was bad, they decided to continue the journey.', 'Recycling helps to reduce the amount of waste we produce.'],
  advanced: ['Remote work has changed the way companies measure productivity.', 'The circular economy aims to keep materials in use for as long as possible.', 'Critics argue that short-term profits often outweigh long-term environmental costs.', 'Despite initial resistance, the policy was eventually accepted by most employees.'],
};

function readBank(name) {
  const p = path.join(ROOT, 'public/items', name + '.json');
  return JSON.parse(fs.readFileSync(p, 'utf8')).items;
}

function readingPool(bankName) {
  const items = readBank(bankName).reading || [];
  const out = items.flatMap((u) => (u.questions || []).map((q, i) => ({ id: `${bankName}-${u.id || 'r'}-${i}`, passage: u.passage, q: q.q, options: q.options, answer: q.answer })));
  // 补充扩展阅读（按 lex 供高单元使用）
  for (const f of ['reading-extra-low.json', 'reading-extra-high.json']) {
    const p = path.join(ROOT, 'public/items', f);
    if (!fs.existsSync(p)) continue;
    for (const u of JSON.parse(fs.readFileSync(p, 'utf8')).passages || []) {
      for (const [i, q] of (u.questions || []).entries()) out.push({ id: `${u.id}-${i}`, passage: u.passage, q: q.q, options: q.options, answer: q.answer, lex: u.lex, level: u.level });
    }
  }
  return out;
}

const units = [];
const pools = {};
for (const L of LEVELS) {
  const b = readBank(L.bank);
  const pool = {
    vocab: (b.vocab || []).map((v) => ({ id: v.id, clue: v.clue || '', q: v.q, options: v.options, answer: v.answer })),
    grammar: (b.grammar || []).map((g) => ({ id: g.id, q: g.sentence || g.q, options: g.options, answer: g.answer })),
    listening: (b.listening || []).flatMap((m) => (m.questions || []).map((q, i) => ({ id: `${m.id}-${i}`, script: m.script, q: q.q, options: q.options, answer: q.answer }))),
    reading: readingPool(L.bank),
    dictation: (DICTATION[L.bank] || []).map((s, i) => ({ id: `d-${L.bank}-${i}`, answer: s })),
    speaking: [
      { id: `s-${L.level}-1`, prompt: 'Read the sentence aloud: “I like learning English.”' },
      { id: `s-${L.level}-2`, prompt: 'Answer in 2–3 sentences: What do you do after school?' },
      { id: `s-${L.level}-3`, prompt: 'Introduce yourself: name, age, one hobby.' },
    ],
    writing: (b.writing || []).map((w) => ({ id: w.id, prompt: w.prompt, minWords: w.minWords || 20 })),
  };
  pools[L.level] = pool;

  const chapters = CHAPTERS.map((title, ci) => ({
    id: ci + 1,
    title,
    lessons: [1, 2, 3, 4, 5].map((li) => {
      const base = SKILLS[(ci * 5 + li - 1) % SKILLS.length];
      const mix = li === 5
        ? ['vocab', 'grammar', 'listening', 'reading', 'dictation', 'writing']
        : [base, base === 'vocab' ? 'grammar' : 'vocab', 'listening', 'reading', 'dictation', base];
      return { id: li, title: `第 ${li} 节 · ${labelOf(mix)}`, skills: mix };
    }),
  }));
  units.push({ unit: L.unit, level: L.level, name: L.name, lex: L.lex, chapters });
}

function labelOf(skills) {
  const map = { vocab: '词汇', grammar: '语法', listening: '听力', reading: '阅读', dictation: '听写', speaking: '口语', writing: '写作' };
  const uniq = [...new Set(skills)];
  return uniq.map((s) => map[s]).join(' + ');
}

fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), units, pools }, null, 1));
console.log(`✅ 课程数据已生成 ${OUT}`);
console.log(`   单元 ${units.length} · 章节/单元 ${CHAPTERS.length} · 小节/章 5 · 题目池：${Object.entries(pools).map(([k, v]) => k + '=' + Object.values(v).reduce((n, a) => n + a.length, 0)).join(', ')}`);
