/**
 * 语音识别代理（MiniMax speech_to_text，asr-1.0）
 * POST /api/school-asr
 * body: { audioBase64, mime?, language? }
 * → { ok:true, text, duration }
 * 未配置 key → 501（不伪造识别结果）
 */
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import type { IncomingMessage, ServerResponse } from 'http';

const MAX_BODY = 30 * 1024 * 1024;

/** 由 dev server 守护的本地识别进程（Vosk） */
let asrProc: ChildProcess | null = null;
let asrStarting = false;
async function localAsrHealthy(): Promise<boolean> {
  try {
    const r = await fetch('http://127.0.0.1:8201/health', { signal: AbortSignal.timeout(1000) });
    return r.ok;
  } catch { return false; }
}
export function ensureLocalAsr(root: string, env: Record<string, string>, attempt = 0): void {
  if (String(env.MINIMAX_DISABLED || '') !== '1') return;
  if (asrStarting) return;
  asrStarting = true;
  void (async () => {
    try {
      if (await localAsrHealthy()) return;
      if (attempt > 20) return;
      const py = env.PYTHON_BIN || 'python';
      const model = env.VOSK_MODEL_DIR || '';
      if (model && !fs.existsSync(model)) return;
      const logDir = path.join(root, 'node_modules', '.cache');
      fs.mkdirSync(logDir, { recursive: true });
      const log = fs.openSync(path.join(logDir, 'local-asr.log'), 'a');
      asrProc = spawn(py, ['scripts/local_asr.py'], {
        cwd: root,
        env: { ...process.env, VOSK_MODEL_DIR: model },
        stdio: ['ignore', log, log],
        windowsHide: true,
      });
      asrProc.on('exit', () => {
        asrProc = null;
        setTimeout(() => { asrStarting = false; ensureLocalAsr(root, env, attempt + 1); }, 3000);
      });
    } finally {
      setTimeout(() => { asrStarting = false; }, 1500);
    }
  })();
}

function loadEnv(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of [path.join(root, '.env'), path.join(root, '..', '.env')]) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      if (out[m[1]]) continue;
      out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return out;
}
function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function extOfMime(mime: string): string {
  if (/mpeg|mp3/i.test(mime)) return 'mp3';
  if (/wav/i.test(mime)) return 'wav';
  if (/webm/i.test(mime)) return 'webm';
  if (/ogg/i.test(mime)) return 'ogg';
  if (/m4a|mp4/i.test(mime)) return 'm4a';
  return 'wav';
}

export function schoolAsrPlugin(): Plugin {
  return {
    name: 'school-asr',
    configureServer(server) {
      const root = server.config.root || process.cwd();
      const env = loadEnv(root);
      ensureLocalAsr(root, env);
      // 每 15 秒巡检：识别服务挂了就自动拉起（避免启动时端口竞争导致放弃）
      setInterval(() => {
        if (String(env.MINIMAX_DISABLED || '') !== '1') return;
        if (asrProc || asrStarting) return;
        void localAsrHealthy().then((ok) => { if (!ok) ensureLocalAsr(root, env, 0); });
      }, 15000);
      server.middlewares.use('/api/school-asr', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, 405, { ok: false, code: 'method-not-allowed' });
        const env = loadEnv(root);
        // 2026-11-12 临时停用 MiniMax：转发到本地离线识别（Vosk），失败再让前端走浏览器识别
        if (String(env.MINIMAX_DISABLED || '') === '1') {
          const localUrl = (env.LOCAL_ASR_URL || 'http://127.0.0.1:8201').replace(/\/+$/, '');
          try {
            const raw = await readBody(req);
            const body = JSON.parse(raw || '{}');
            const b64 = String(body.audioBase64 || '').replace(/^data:[^;]+;base64,/, '');
            if (!b64) return sendJson(res, 400, { ok: false, code: 'empty-audio' });
            const upstream = await fetch(localUrl + '/asr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: b64, mime: String(body.mime || 'audio/wav'), language: String(body.language || 'en') }),
              signal: AbortSignal.timeout(25000),
            });
            const text = await upstream.text();
            if (!upstream.ok) return sendJson(res, 503, { ok: false, code: 'local-asr-failed', detail: text.slice(0, 160) });
            let data: any = {};
            try { data = JSON.parse(text); } catch { /* keep */ }
            return sendJson(res, 200, { ok: true, text: String(data.text || ''), local: true });
          } catch {
            return sendJson(res, 503, { ok: false, code: 'local-asr-down', hint: '本地识别服务未启动（node scripts/local_asr.py）' });
          }
        }
        const key = (env.MINIMAX_API_KEY || env.VITE_MINIMAX_API_KEY || '').trim();
        const base = (env.MINIMAX_API_BASE || 'https://api.minimaxi.com').replace(/\/+$/, '');
        if (!key) {
          return sendJson(res, 501, {
            ok: false, code: 'minimax-not-configured',
            hint: '在 .env 配置 MINIMAX_API_KEY 后重启 dev server',
            where: 'https://platform.minimaxi.com/console',
          });
        }
        try {
          const raw = await readBody(req);
          const body = JSON.parse(raw || '{}');
          const b64 = String(body.audioBase64 || '').replace(/^data:[^;]+;base64,/, '');
          if (!b64) return sendJson(res, 400, { ok: false, code: 'empty-audio' });
          const mime = String(body.mime || 'audio/wav');
          const lang = String(body.language || 'en');
          const bytes = Buffer.from(b64, 'base64');
          const fd = new FormData();
          fd.append('model', 'asr-1.0');
          fd.append('response_format', 'json');
          fd.append('file', new Blob([new Uint8Array(bytes)], { type: mime }), 'audio.' + extOfMime(mime));
          const upstream = await fetch(`${base}/v1/speech_to_text`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, language: lang },
            body: fd,
          });
          const text = await upstream.text();
          let data: any = {};
          try { data = JSON.parse(text); } catch { /* keep */ }
          if (!upstream.ok) {
            return sendJson(res, 502, { ok: false, code: 'asr-failed', status: upstream.status, detail: text.slice(0, 300) });
          }
          sendJson(res, 200, {
            ok: true,
            text: String(data.text || ''),
            duration: Number(data.duration || 0),
            audioSeconds: Math.round(bytes.length / 32000 * 10) / 10,
          });
        } catch (e) {
          sendJson(res, 500, { ok: false, code: 'asr-proxy-failed', detail: String(e instanceof Error ? e.message : e).slice(0, 300) });
        }
      });
    },
  };
}
