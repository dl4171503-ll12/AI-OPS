import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import path from 'node:path';
import readline from 'node:readline';
const [file, output] = process.argv.slice(2);
if (!file || !output || !process.stdin.isTTY) {
  console.error('在本机交互终端运行：node scripts/ops-decrypt.mjs <密文档案路径> <解密输出目录>');
  process.exit(1);
}
process.stdout.write('归档口令（输入不可见）：');
readline.emitKeypressEvents(process.stdin); process.stdin.setRawMode(true); process.stdin.resume();
let password = '';
await new Promise((resolve, reject) => {
  const handle = (str, key) => {
    if (key?.ctrl && key.name === 'c') { process.stdin.off('keypress', handle); reject(new Error('已取消')); }
    else if (key?.name === 'return') { process.stdin.off('keypress', handle); resolve(); }
    else if (key?.name === 'backspace') password = password.slice(0, -1);
    else if (str && !key?.ctrl) password += str;
  };
  process.stdin.on('keypress', handle);
}).finally(() => { process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); });
try {
  const envelope = JSON.parse(await readFile(file, 'utf8'));
  if (envelope.version !== 1 || envelope.iterations !== 310000 || envelope.algorithm !== 'AES-256-GCM') throw new Error('不支持的档案格式');
  const material = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  password = '';
  const key = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt: Buffer.from(envelope.salt, 'base64'), iterations: envelope.iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(envelope.iv, 'base64') }, key, Buffer.from(envelope.ciphertext, 'base64'));
  const data = JSON.parse(new TextDecoder().decode(plain));
  await mkdir(output, { recursive: true });
  // 固定文件名，不信任档案中的路径；已有文件不覆盖。
  await writeFile(path.join(output, 'learning.json'), JSON.stringify(data.files['learning.json'], null, 2), { flag: 'wx', mode: 0o600 });
  await writeFile(path.join(output, 'report.md'), data.files['report.md'], { flag: 'wx', mode: 0o600 });
  console.log('已解密到指定目录。解密后的文件是明文，请放在受保护的个人目录中。');
} catch { console.error('解密或写入失败：检查口令、档案格式，以及输出目录是否已有同名文件。'); process.exitCode = 1; }
