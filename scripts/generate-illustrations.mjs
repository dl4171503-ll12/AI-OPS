// 批量生成测评插图（MiniMax image_generation，经本地 /api/school-image 代理）
//
// 风格规则：
//   beginner（1–3 年级）→ 卡通风格
//   intermediate（4–6 年级）及以上 → 简笔画（黑白线条）
//
// 生成内容：
//   每篇 1 张主图（key: p:<id>）
//   beginner / intermediate 的每道题再配 1 张场景图（key: q:<id>:<qi>），
//   场景图按“故事画面”生成而不是按题目答案生成，避免泄题。
//
// 用法：
//   node scripts/generate-illustrations.mjs                # 生成全部缺失（主图+低中年级题图）
//   node scripts/generate-illustrations.mjs --mains-only   # 只生成主图
//   node scripts/generate-illustrations.mjs --only x-low-200-1
//   node scripts/generate-illustrations.mjs --force --limit 10
//   IMAGE_ENDPOINT=http://127.0.0.1:918/api/school-image（默认）
import fs from 'node:fs';
import path from 'node:path';
import { SCENES } from './illustration-scenes.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'public', 'illustrations');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const ENDPOINT = process.env.IMAGE_ENDPOINT || 'http://127.0.0.1:918/api/school-image';
const LEVELS = ['beginner', 'intermediate', 'ielts-prep', 'advanced'];

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i > -1 ? (args[i + 1] ?? true) : def; };
const only = opt('only', null);
const force = !!opt('force', false);
const mainsOnly = !!opt('mains-only', false);
const limit = Number(opt('limit', 0)) || 0;
const scenesOnly = !!opt('scenes-only', false);
const aspect = opt('aspect', '4:3');

/* ---- 读取全部阅读文章 ---- */
const passages = [];
for (const lv of LEVELS) {
  const file = path.join(ROOT, 'public', 'items', `${lv}.json`);
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  (data.items?.reading || []).forEach((u, i) => {
    passages.push({
      id: `${lv}-r${i + 1}`, level: lv, lex: null,
      topic: String(u.passage || '').slice(0, 120),
      zh: null, source: u.source || '',
    });
  });
}
for (const f of ['reading-extra-low.json', 'reading-extra-high.json']) {
  const file = path.join(ROOT, 'public', 'items', f);
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  (data.passages || []).forEach((u) => {
    passages.push({
      id: u.id, level: u.level || (u.lex < 450 ? 'beginner' : 'intermediate'), lex: u.lex,
      topic: String(u.passage || '').slice(0, 120),
      zh: u.zh || null, source: u.source || '',
    });
  });
}
console.log(`文章总数：${passages.length}`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};

const isJunior = (p) => p.level === 'beginner';
function styleFor(p) {
  return isJunior(p)
    ? '卡通风格儿童绘本插图：明快色彩，圆润可爱，白色背景，画面中不要出现任何文字'
    : '简笔画风格：黑色线条，白色背景，不要上色，不要文字，简洁清晰';
}
function topicFor(p) {
  if (p.zh?.summary) return p.zh.summary;
  return p.topic;
}
function mainPrompt(p) {
  return `${styleFor(p)}。内容：${topicFor(p)}`;
}
function questionPrompt(p, qi) {
  // 不引用题目本身，避免把答案画出来；只做“同一故事的不同画面”
  const variants = [
    '故事开始时的场景',
    '故事中段的场景',
    '故事转折处的场景',
    '故事结尾的场景',
  ];
  return `${styleFor(p)}。画一个${variants[qi % 4]}：${topicFor(p)}`;
}

async function generate(prompt) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspect_ratio: aspect, n: 1 }),
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 501) {
    console.error('\n❌ 未配置图片 key（' + (data.code || 501) + '）');
    console.error('   ' + (data.hint || ''));
    console.error('   拿 key：' + (data.where || 'https://platform.minimaxi.com/console'));
    process.exit(3);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${data.detail || data.code || ''}`);
  const img = (data.images || [])[0];
  if (!img) throw new Error('接口未返回图片');
  if (img.base64) return Buffer.from(img.base64, 'base64');
  if (img.url) {
    const r = await fetch(img.url);
    if (!r.ok) throw new Error('下载图片失败 ' + r.status);
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error('图片格式未知');
}

function extOf(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf.slice(0, 4).toString() === 'RIFF') return 'webp';
  return 'png';
}

async function saveOne(key, prompt, label) {
  const existing = manifest[key];
  if (!force && existing && fs.existsSync(path.join(ROOT, 'public', existing.replace(/^\//, '')))) {
    console.log(`跳过 ${label}`);
    return false;
  }
  try {
    const buf = await generate(prompt);
    const ext = extOf(buf);
    const file = path.join(OUT_DIR, `${key.replace(/[:]/g, '_')}.${ext}`);
    fs.writeFileSync(file, buf);
    manifest[key] = `/illustrations/${path.basename(file)}`;
    console.log(`OK   ${label} (${(buf.length / 1024).toFixed(0)}KB)`);
    return true;
  } catch (e) {
    // 限流/超时重试一次
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const buf = await generate(prompt);
      const ext = extOf(buf);
      const file = path.join(OUT_DIR, `${key.replace(/[:]/g, '_')}.${ext}`);
      fs.writeFileSync(file, buf);
      manifest[key] = `/illustrations/${path.basename(file)}`;
      console.log(`OK   ${label}（重试成功，${(buf.length / 1024).toFixed(0)}KB）`);
      return true;
    } catch (e2) {
      console.log(`FAIL ${label}：${e2.message}`);
      return false;
    }
  }
}

let made = 0, fail = 0, calls = 0;
const list = passages.filter((p) => (!only || p.id === only) && (!scenesOnly || SCENES[p.id]));
const plan = [];
for (const p of list) {
  const scene = SCENES[p.id];
  plan.push({
    p, key: `p:${p.id}`,
    prompt: styleFor(p) + '。' + (scene ? scene[0] : topicFor(p)),
    label: `主图 ${p.id} [${isJunior(p) ? '卡通' : '简笔'}]`,
  });
  if (!mainsOnly) {
    const qCount = scene
      ? scene.length - 1
      : (p.level === 'beginner' || p.level === 'intermediate' ? 4 : 0);
    for (let qi = 0; qi < qCount; qi++) {
      plan.push({
        p, key: `q:${p.id}:${qi}`,
        prompt: styleFor(p) + '。' + (scene ? scene[qi + 1] : questionPrompt(p, qi)),
        label: `题图 ${p.id} #${qi + 1} [${isJunior(p) ? '卡通' : '简笔'}]`,
      });
    }
  }
}
console.log(`计划生成：${plan.length} 张${limit ? `（本次上限 ${limit}）` : ''}`);
for (const item of plan) {
  if (limit && calls >= limit) { console.log(`达到本次上限 ${limit}，停止`); break; }
  calls++;
  const ok = await saveOne(item.key, item.prompt, item.label);
  if (ok) made++; else if (!manifest[item.key]) fail++;
  // 写一次清单，防止中断丢进度
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  await new Promise((r) => setTimeout(r, 400));
}
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

// 清理分镜数量变化后多余的旧题图（例如狮子从 5 张改为 3 张）
for (const p of list) {
  const scene = SCENES[p.id];
  if (!scene) continue;
  const keep = new Set(Array.from({ length: scene.length - 1 }, (_, qi) => `q:${p.id}:${qi}`));
  for (const key of Object.keys(manifest)) {
    if (key.startsWith(`q:${p.id}:`) && !keep.has(key)) {
      const rel = manifest[key];
      delete manifest[key];
      try { fs.unlinkSync(path.join(ROOT, 'public', rel.replace(/^\//, ''))); } catch {}
      console.log(`清理多余分镜 ${key}`);
    }
  }
}
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

console.log(`\n完成：新生成 ${made}，失败 ${fail}，清单共 ${Object.keys(manifest).length} 张`);
console.log('重新构建页面：node scripts/build-assessment.mjs');
process.exitCode = fail ? 1 : 0;
