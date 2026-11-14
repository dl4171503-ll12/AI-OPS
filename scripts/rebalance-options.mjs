// 配平题库：把正确答案在选项中的位置打散（当前 71–90% 在第一位，点第一个就能蒙对）
// 用法：node scripts/rebalance-options.mjs [--dry]
import fs from 'node:fs';

const DRY = process.argv.includes('--dry');
const LEVELS = ['beginner', 'intermediate', 'ielts-prep', 'advanced'];

let counter = 0;
function rebalance(options, answer) {
  if (!Array.isArray(options) || options.length !== 3) return options;
  const cur = options.indexOf(answer);
  if (cur < 0) return options;
  const target = counter % 3;               // 轮转目标位置 0/1/2
  counter++;
  if (cur === target) return options;
  const rest = options.filter((_, i) => i !== cur);
  rest.splice(target, 0, answer);
  return rest;
}

for (const lv of LEVELS) {
  const file = `public/items/${lv}.json`;
  const bank = JSON.parse(fs.readFileSync(file, 'utf8'));
  const it = bank.items;
  const stats = { before: [0, 0, 0], after: [0, 0, 0], n: 0 };

  const fix = (obj) => {
    if (!obj || !Array.isArray(obj.options)) return;
    const beforeIdx = obj.options.indexOf(obj.answer);
    if (beforeIdx >= 0) stats.before[beforeIdx]++;
    obj.options = rebalance(obj.options, obj.answer);
    const afterIdx = obj.options.indexOf(obj.answer);
    if (afterIdx >= 0) stats.after[afterIdx]++;
    stats.n++;
  };

  (it.vocab || []).forEach(fix);
  (it.grammar || []).forEach(fix);
  (it.listening || []).forEach(u => (u.questions || []).forEach(fix));
  (it.reading || []).forEach(u => (u.questions || []).forEach(fix));

  if (!DRY) fs.writeFileSync(file, JSON.stringify(bank, null, 2) + '\n');
  console.log(`${lv.padEnd(12)} 题目 ${stats.n} · 配平前 1/2/3 位 = ${stats.before.join('/')} → 配平后 = ${stats.after.join('/')}`);
}
console.log(DRY ? '\n(dry-run，未写入)' : '\n✅ 已写回题库');
