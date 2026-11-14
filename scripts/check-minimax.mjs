// 检查 MiniMax 密钥是否可用：鉴权 + 余额（不打印密钥、不产生生图费用）
// 用法：node scripts/check-minimax.mjs
import fs from 'node:fs';

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const key = env.MINIMAX_API_KEY;
const base = (env.MINIMAX_API_BASE || 'https://api.minimaxi.com').replace(/\/+$/, '');
if (!key) { console.error('❌ .env 缺少 MINIMAX_API_KEY'); process.exit(2); }
console.log(`base: ${base}`);
console.log(`key: ${key.slice(0, 8)}… (len=${key.length})`);

const payload = {
  model: env.MINIMAX_IMAGE_MODEL || 'image-01',
  prompt: 'a simple red circle on white background, minimal illustration',
  aspect_ratio: '1:1',
  response_format: 'url',
  n: 1,
};

const res = await fetch(base + '/v1/image_generation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
  body: JSON.stringify(payload),
});
const text = await res.text();
let data = null;
try { data = JSON.parse(text); } catch {}
console.log('HTTP', res.status);
if (!data) { console.log('raw:', text.slice(0, 300)); process.exit(1); }
console.log('base_resp:', JSON.stringify(data.base_resp));
const code = data?.base_resp?.status_code;
if (code === 0) {
  console.log('✅ 密钥可用、有余额，生图链路正常');
} else if (code === 1008) {
  console.log('⚠️ 密钥有效，但账户余额不足（需在控制台充值）');
  console.log('   控制台：https://platform.minimaxi.com/user-center/payment/balance');
} else if (code === 2049 || code === 1004) {
  console.log('❌ 密钥无效或不属于该站点（中国站 key 用 https://api.minimaxi.com）');
} else if (code === 1002) {
  console.log('⚠️ 触发限流，稍后再试');
} else {
  console.log('❌ 其他错误码：', code, data?.base_resp?.status_msg);
  process.exit(1);
}
