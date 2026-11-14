// 题库校验器：node scripts/validate-items.mjs public/items/beginner.json
import fs from 'node:fs';

const REQUIRED = { vocab: 12, grammar: 9, listeningUnits: 6, readingUnits: 2, speaking: 4, writing: 4 };
const PER_LISTENING = 2; // 每个听力材料 2 题
const PER_READING = 4; // 每个阅读材料 4 题

const file = process.argv[2];
if (!file) {
  console.error('用法: node scripts/validate-items.mjs <items.json>');
  process.exit(2);
}
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [];
const warn = [];

const L = data.level;
if (!['beginner', 'intermediate', 'ielts-prep', 'advanced'].includes(L)) errors.push(`level 非法: ${L}`);

const has = (o, k) => o && typeof o[k] === 'string' && o[k].trim().length > 0;
const isTier = (t) => t === 1 || t === 2 || t === 3;

/** 编辑距离（限短词）：防止 ball/bell/bill 这类"只考拼写"的选项 */
function editDistance(a, b) {
  a = String(a).toLowerCase(); b = String(b).toLowerCase();
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

function checkMcq(item, where, { requireClue = false, forbidNearSpelling = false } = {}) {
  if (!has(item, 'sentence') && !has(item, 'q')) errors.push(`${where}: 缺少题干 sentence/q`);
  if (requireClue && !has(item, 'clue')) errors.push(`${where}: 词汇题必须给语义线索 clue（否则只考拼写）`);
  if (!Array.isArray(item.options) || item.options.length !== 3) errors.push(`${where}: options 必须是 3 个选项`);
  if (!item.options.includes(item.answer)) errors.push(`${where}: answer 不在 options 中`);
  if (!isTier(item.tier)) errors.push(`${where}: tier 必须是 1/2/3`);
  if (new Set(item.options).size !== 3) errors.push(`${where}: 选项重复`);
  if (forbidNearSpelling) {
    for (let i = 0; i < item.options.length; i++) {
      for (let j = i + 1; j < item.options.length; j++) {
        const d = editDistance(item.options[i], item.options[j]);
        if (d <= 1) errors.push(`${where}: 选项「${item.options[i]}」与「${item.options[j]}」只差 1 个字母——属于拼写近形题，须换成不同词义的词`);
      }
    }
  }
}

const cc = (kind) => (data.items?.[kind] || []).length;

// vocab：必须给语义线索；禁止拼写近形干扰项
(data.items?.vocab || []).forEach((it, i) =>
  checkMcq(it, `vocab[${i}]`, { requireClue: true, forbidNearSpelling: true }));
if (cc('vocab') !== REQUIRED.vocab) errors.push(`vocab 数量 ${cc('vocab')} ≠ ${REQUIRED.vocab}`);

// grammar
(data.items?.grammar || []).forEach((it, i) => {
  checkMcq(it, `grammar[${i}]`);
  if (!String(it.sentence || '').includes('___')) errors.push(`grammar[${i}]: 题干必须含空格 ___`);
});
if (cc('grammar') !== REQUIRED.grammar) errors.push(`grammar 数量 ${cc('grammar')} ≠ ${REQUIRED.grammar}`);

// listening
let listenQ = 0;
(data.items?.listening || []).forEach((u, i) => {
  if (!has(u, 'script')) errors.push(`listening[${i}]: 缺少 script`);
  if (!isTier(u.tier)) errors.push(`listening[${i}]: tier 非法`);
  if (!Array.isArray(u.questions) || u.questions.length !== PER_LISTENING)
    errors.push(`listening[${i}]: 必须 ${PER_LISTENING} 个问题`);
  (u.questions || []).forEach((q, j) => {
    listenQ++;
    if (!has(q, 'q')) errors.push(`listening[${i}].questions[${j}]: 缺少 q`);
    if (!Array.isArray(q.options) || q.options.length !== 3) errors.push(`listening[${i}].q${j}: 需 3 选项`);
    if (!q.options?.includes(q.answer)) errors.push(`listening[${i}].q${j}: answer 不在选项中`);
  });
});
if ((data.items?.listening || []).length !== REQUIRED.listeningUnits)
  errors.push(`listening 材料数 ${(data.items?.listening || []).length} ≠ ${REQUIRED.listeningUnits}`);

// reading
let readQ = 0;
(data.items?.reading || []).forEach((u, i) => {
  if (!has(u, 'passage')) errors.push(`reading[${i}]: 缺少 passage`);
  if (!has(u, 'source')) warn.push(`reading[${i}]: 建议补 source`);
  if (!isTier(u.tier)) errors.push(`reading[${i}]: tier 非法`);
  if (!Array.isArray(u.questions) || u.questions.length !== PER_READING)
    errors.push(`reading[${i}]: 必须 ${PER_READING} 个问题`);
  (u.questions || []).forEach((q, j) => {
    readQ++;
    if (!has(q, 'q')) errors.push(`reading[${i}].questions[${j}]: 缺少 q`);
    if (!Array.isArray(q.options) || q.options.length !== 3) errors.push(`reading[${i}].q${j}: 需 3 选项`);
    if (!q.options?.includes(q.answer)) errors.push(`reading[${i}].q${j}: answer 不在选项中`);
  });
});
if ((data.items?.reading || []).length !== REQUIRED.readingUnits)
  errors.push(`reading 材料数 ${(data.items?.reading || []).length} ≠ ${REQUIRED.readingUnits}`);

// speaking / writing
(data.items?.speaking || []).forEach((it, i) => {
  if (!has(it, 'prompt')) errors.push(`speaking[${i}]: 缺少 prompt`);
  if (!Number.isFinite(it.minWords) || it.minWords < 10) errors.push(`speaking[${i}]: minWords 需 ≥10`);
  if (!isTier(it.tier)) errors.push(`speaking[${i}]: tier 非法`);
});
if (cc('speaking') !== REQUIRED.speaking) errors.push(`speaking 数量 ${cc('speaking')} ≠ ${REQUIRED.speaking}`);

(data.items?.writing || []).forEach((it, i) => {
  if (!has(it, 'prompt')) errors.push(`writing[${i}]: 缺少 prompt`);
  if (!Number.isFinite(it.minWords) || it.minWords < 15) errors.push(`writing[${i}]: minWords 需 ≥15`);
  if (!isTier(it.tier)) errors.push(`writing[${i}]: tier 非法`);
});
if (cc('writing') !== REQUIRED.writing) errors.push(`writing 数量 ${cc('writing')} ≠ ${REQUIRED.writing}`);

// 总数
const total = cc('vocab') + cc('grammar') + listenQ + readQ + cc('speaking') + cc('writing');
if (total !== 49) errors.push(`总题数 ${total} ≠ 49`);

// 难度分布：tier1/2/3 各至少 8 题，且 tier3 必须有
const tiers = { 1: 0, 2: 0, 3: 0 };
const bump = (t) => { if (isTier(t)) tiers[t]++; };
(data.items?.vocab || []).forEach((x) => bump(x.tier));
(data.items?.grammar || []).forEach((x) => bump(x.tier));
(data.items?.listening || []).forEach((u) => { for (let k = 0; k < (u.questions || []).length; k++) bump(u.tier); });
(data.items?.reading || []).forEach((u) => { for (let k = 0; k < (u.questions || []).length; k++) bump(u.tier); });
(data.items?.speaking || []).forEach((x) => bump(x.tier));
(data.items?.writing || []).forEach((x) => bump(x.tier));
for (const t of [1, 2, 3]) if (tiers[t] < 8) errors.push(`tier${t} 题数 ${tiers[t]} < 8（难度阶梯不足）`);

// 中文混入英文题干的粗检
const englishish = (s) => /[a-zA-Z]/.test(s);
(data.items?.vocab || []).forEach((x, i) => { if (!englishish(x.sentence || '')) errors.push(`vocab[${i}] 句子不含英文`); });

// 答案位置均衡（防"点第一个就能蒙对"）
{
  const pos = [0, 0, 0];
  let total = 0;
  const tally = (obj) => {
    const i = obj?.options?.indexOf(obj.answer);
    if (i >= 0 && i < 3) { pos[i]++; total++; }
  };
  (data.items?.vocab || []).forEach(tally);
  (data.items?.grammar || []).forEach(tally);
  (data.items?.listening || []).forEach(u => (u.questions || []).forEach(tally));
  (data.items?.reading || []).forEach(u => (u.questions || []).forEach(tally));
  if (total > 0) {
    const maxShare = Math.max(...pos) / total;
    if (maxShare > 0.5) {
      errors.push(`答案位置过度集中：1/2/3 位 = ${pos.join('/')}，最大占比 ${Math.round(maxShare * 100)}% > 50%（点第一个就能蒙对，须配平）`);
    }
  }
}

console.log(`文件: ${file}`);
console.log(`题数: vocab=${cc('vocab')} grammar=${cc('grammar')} listening=${cc('listening')}材料/${listenQ}题 reading=${cc('reading')}材料/${readQ}题 speaking=${cc('speaking')} writing=${cc('writing')} → 总计 ${total}`);
console.log(`难度分布: tier1=${tiers[1]} tier2=${tiers[2]} tier3=${tiers[3]}`);
if (warn.length) console.log('提示:\n  ' + warn.join('\n  '));
if (errors.length) {
  console.error('\n❌ 校验失败:');
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log('\n✅ 校验通过');
