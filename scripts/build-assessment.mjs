// 把题库 JSON 注入模板，生成单文件 HTML
// 用法：node scripts/build-assessment.mjs [--items-dir public/items] [--out public/english-assessment.html]
import fs from 'node:fs';
import path from 'node:path';

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : def;
}

const ITEMS_DIR = arg('items-dir', 'public/items');
const OUT = arg('out', 'public/english-assessment.html');
const TEMPLATE = 'scripts/templates/assessment.template.html';
const ROOT = process.cwd();
const LEVELS = ['beginner', 'intermediate', 'ielts-prep', 'advanced'];

const errors = [];
function validate(data, file) {
  const where = path.basename(file);
  const it = data?.items || {};
  const n = (k) => (it[k] || []).length;
  if (n('vocab') !== 12) errors.push(`${where}: vocab=${n('vocab')} ≠ 12`);
  if (n('grammar') !== 9) errors.push(`${where}: grammar=${n('grammar')} ≠ 9`);
  if (n('listening') !== 6) errors.push(`${where}: listening 材料=${n('listening')} ≠ 6`);
  if (n('reading') !== 2) errors.push(`${where}: reading 材料=${n('reading')} ≠ 2`);
  if (n('speaking') !== 4) errors.push(`${where}: speaking=${n('speaking')} ≠ 4`);
  if (n('writing') !== 4) errors.push(`${where}: writing=${n('writing')} ≠ 4`);

  let total = 0;
  const tiers = { 1: 0, 2: 0, 3: 0 };
  const bump = (t) => { if (t === 1 || t === 2 || t === 3) tiers[t]++; };
  const mcqOk = (o, tag) => {
    if (!Array.isArray(o.options) || o.options.length !== 3) errors.push(`${where} ${tag}: 选项数≠3`);
    if (!o.options?.includes(o.answer)) errors.push(`${where} ${tag}: answer 不在选项中`);
    if (new Set(o.options || []).size !== 3) errors.push(`${where} ${tag}: 选项重复`);
  };
  (it.vocab || []).forEach((v, i) => { total++; bump(v.tier); mcqOk(v, `vocab[${i}]`); });
  (it.grammar || []).forEach((v, i) => { total++; bump(v.tier); mcqOk(v, `grammar[${i}]`); });
  (it.listening || []).forEach((u, i) => {
    (u.questions || []).forEach((q, j) => { total++; bump(u.tier); mcqOk(q, `listening[${i}].q${j}`); });
  });
  (it.reading || []).forEach((u, i) => {
    (u.questions || []).forEach((q, j) => { total++; bump(u.tier); mcqOk(q, `reading[${i}].q${j}`); });
  });
  (it.speaking || []).forEach((s, i) => { total++; bump(s.tier); if (!s.prompt) errors.push(`${where} speaking[${i}]: 缺 prompt`); });
  (it.writing || []).forEach((w, i) => { total++; bump(w.tier); if (!w.prompt) errors.push(`${where} writing[${i}]: 缺 prompt`); });

  if (total !== 49) errors.push(`${where}: 总题数=${total} ≠ 49`);
  for (const t of [1, 2, 3]) if (tiers[t] < 8) errors.push(`${where}: tier${t}=${tiers[t]} < 8`);
  return { total, tiers };
}

if (!fs.existsSync(TEMPLATE)) {
  console.error('缺少模板: ' + TEMPLATE);
  process.exit(2);
}
const tpl = fs.readFileSync(TEMPLATE, 'utf8');
if (!tpl.includes('/*__BANK__*/')) {
  console.error('模板缺少 /*__BANK__*/ 占位符');
  process.exit(2);
}

const BANK = {};
for (const lvl of LEVELS) {
  const file = path.join(ITEMS_DIR, lvl + '.json');
  if (!fs.existsSync(file)) {
    console.error(`❌ 缺少题库文件: ${file}`);
    process.exit(2);
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { total, tiers } = validate(data, file);
  BANK[lvl] = data;
  console.log(`  ${lvl.padEnd(12)} 49 题 · tier ${tiers[1]}/${tiers[2]}/${tiers[3]}`);
}

// 扩展阅读文章（蓝思阶梯用；可多文件合并）
const EXTRA_READINGS = [];
for (const f of ['reading-extra-low.json', 'reading-extra-high.json']) {
  const p = path.join(ITEMS_DIR, f);
  if (!fs.existsSync(p)) { console.log(`  (跳过缺失的 ${f})`); continue; }
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const list = data.passages || [];
  list.forEach((x) => EXTRA_READINGS.push(x));
  console.log(`  ${f.padEnd(28)} ${list.length} 篇扩展阅读`);
}
const seen = new Set();
for (const r of EXTRA_READINGS) {
  if (seen.has(r.id)) errors.push(`扩展阅读 id 重复: ${r.id}`);
  seen.add(r.id);
}
if (EXTRA_READINGS.length && EXTRA_READINGS.length < 8) errors.push(`扩展阅读仅 ${EXTRA_READINGS.length} 篇，阶梯会重复`);

// 真实插图（可选）：public/illustrations/manifest.json → { "<passageId>": "/illustrations/xxx.png" }
const ILLUSTRATIONS = {};
{
  const p = path.join(ROOT, 'public', 'illustrations', 'manifest.json');
  if (fs.existsSync(p)) {
    try {
      const m = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const [k, v] of Object.entries(m)) if (typeof v === 'string' && v) ILLUSTRATIONS[k] = v;
      console.log(`  插图清单             ${Object.keys(ILLUSTRATIONS).length} 张`);
    } catch (e) {
      console.log(`  (插图清单解析失败，忽略: ${e.message})`);
    }
  }
}
if (errors.length) {
  console.error('\n❌ 题库校验失败:');
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

const html = tpl.replace('/*__BANK__*/',
  'const BANK = ' + JSON.stringify(BANK) + ';\nconst EXTRA_READINGS = ' + JSON.stringify(EXTRA_READINGS) +
  ';\nconst ILLUSTRATIONS = ' + JSON.stringify(ILLUSTRATIONS) + ';');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`\n✅ 已生成 ${OUT}（${kb} KB，4 档 × 49 题 + ${EXTRA_READINGS.length} 篇扩展阅读）`);
