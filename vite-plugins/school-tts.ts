/**
 * 学校朗读：优先 MiniMax 超真人（speech-02-hd），失败再 Edge TTS
 * POST /api/school-tts
 *
 * MiniMax body:
 *   { text, voice_id?, model?, speed?, emotion?, voice_modify?, sample_base64?, feature? }
 * Edge body:
 *   { text, voice?, rate?, pitch?, engine: 'edge' }
 * → audio/mpeg
 */
import type { Plugin, Connect } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';

const MAX_CHARS = 2800;
const DEFAULT_VOICE = 'zh-CN-XiaoxiaoNeural';
const GATEWAY = 'https://app-coce6zbtnke9-api-DLEO7Bj0lORa-gateway.appmiaoda.com';
const STABLE_CLONE_VOICE_ID = 'AiSchoolTeacher01';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 全局串行队列：MiniMax TTS 有 RPM 限制，并发请求会 1002 限流 */
let ttsQueue: Promise<unknown> = Promise.resolve();
function serializeTTS<T>(fn: () => Promise<T>): Promise<T> {
  const p = ttsQueue.then(fn, fn);
  ttsQueue = p.catch(() => {});
  return p as Promise<T>;
}

function pluginRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

function integrationsKey(root: string): string {
  const env = loadEnv(root);
  return (
    env.INTEGRATIONS_API_KEY ||
    env.MINIMAX_API_KEY ||
    env.VITE_INTEGRATIONS_API_KEY ||
    process.env.INTEGRATIONS_API_KEY ||
    ''
  ).trim();
}

function base64ToBuffer(b64: string): Buffer {
  const cleaned = b64.replace(/^data:[^;]+;base64,/, '');
  return Buffer.from(cleaned, 'base64');
}

async function synthesizeEdgeMp3(text: string, voice: string, rate = '+0%', pitch = '+0Hz', root?: string): Promise<Buffer> {
  // 临时方案：MiniMax 停用期间用 Python edge-tts（免费）合成，带磁盘缓存
  const env = loadEnv(root || pluginRoot());
  const py = env.PYTHON_BIN || process.env.PYTHON_BIN || 'python';
  const dir = path.join(root || pluginRoot(), 'node_modules', '.cache', 'edge-tts');
  fs.mkdirSync(dir, { recursive: true });
  const key = crypto.createHash('sha1').update(text + '|' + voice + '|' + rate).digest('hex').slice(0, 20);
  const cached = path.join(dir, key + '.mp3');
  if (fs.existsSync(cached) && fs.statSync(cached).size > 500) return fs.readFileSync(cached);
  const tmp = path.join(os.tmpdir(), 'edge-' + key + '-' + Date.now() + '.mp3');
  const buf = await new Promise<Buffer>((resolve, reject) => {
    const p = spawn(py, ['-m', 'edge_tts', '--voice', voice, '--rate=' + rate, '--text', text, '--write-media', tmp], {
      windowsHide: true,
    });
    let err = '';
    const timer = setTimeout(() => {
      try { p.kill(); } catch {}
      reject(new Error('edge-tts timeout'));
    }, 30000);
    p.stderr.on('data', (d) => { err += String(d); });
    p.on('error', (e) => { clearTimeout(timer); reject(e); });
    p.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) { reject(new Error('edge-tts exit ' + code + ': ' + err.slice(0, 160))); return; }
      try {
        const bytes = fs.readFileSync(tmp);
        if (!bytes.length) throw new Error('edge-tts empty');
        fs.writeFileSync(cached, bytes);
        resolve(bytes);
      } catch (e) { reject(e); } finally { try { fs.unlinkSync(tmp); } catch {} }
    });
  });
  return buf;
}

async function fetchMp3FromUrl(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载音频失败 ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function minimaxT2a(opts: {
  apiKey: string;
  text: string;
  voiceId: string;
  model: string;
  speed: number;
  emotion?: string;
  voice_modify?: { pitch?: number; intensity?: number; timbre?: number };
  direct?: boolean;
  base?: string;
  english?: boolean;
}): Promise<Buffer> {
  const voice_setting: Record<string, unknown> = {
    voice_id: opts.voiceId,
    speed: opts.speed,
    vol: 1,
  };
  if (opts.emotion) voice_setting.emotion = opts.emotion;

  const payload: Record<string, unknown> = {
    model: opts.model,
    text: opts.text.slice(0, MAX_CHARS),
    stream: false,
    output_format: 'hex',
    voice_setting,
    audio_setting: { format: 'mp3', sample_rate: 32000, bitrate: 128000 },
  };
  if (opts.english) payload.language_boost = 'English';
  if (opts.voice_modify) {
    payload.voice_modify = {
      pitch: Math.max(-100, Math.min(100, Number(opts.voice_modify.pitch ?? 0))),
      intensity: Math.max(-100, Math.min(100, Number(opts.voice_modify.intensity ?? 0))),
      timbre: Math.max(-100, Math.min(100, Number(opts.voice_modify.timbre ?? 0))),
    };
  }

  const direct = Boolean(opts.direct);
  const url = direct
    ? `${(opts.base || 'https://api.minimaxi.com').replace(/\/+$/, '')}/v1/t2a_v2`
    : `${GATEWAY}/v1/t2a_v2`;
  const headers: Record<string, string> = direct
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.apiKey}` }
    : { 'Content-Type': 'application/json', 'X-Gateway-Authorization': `Bearer ${opts.apiKey}` };

  let upstream = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });

  if (!upstream.ok && opts.model === 'speech-02-hd') {
    payload.model = 'speech-02-turbo';
    upstream = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  }

  if (!upstream.ok) {
    const err = await upstream.text().catch(() => '');
    throw new Error(`MiniMax ${upstream.status}: ${err.slice(0, 180)}`);
  }
  let result = (await upstream.json()) as {
    base_resp?: { status_code?: number; status_msg?: string };
    data?: { audio?: string };
  };
  // 限流（RPM）自动重试一次
  if (result.base_resp?.status_code === 1002) {
    await sleep(1100);
    const retry = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (retry.ok) {
      result = (await retry.json()) as typeof result;
    }
  }
  if (result.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax TTS: ${result.base_resp?.status_msg || 'unknown'}`);
  }
  const audio = result.data?.audio;
  if (!audio) throw new Error('MiniMax 未返回音频');
  // output_format=hex 时返回十六进制音频；兼容旧网关返回 URL 的情况
  if (/^[0-9a-f]+$/i.test(audio) && audio.length % 2 === 0) {
    return Buffer.from(audio, 'hex');
  }
  return fetchMp3FromUrl(audio);
}

/** 样本克隆（本地缓存 voice_id，避免每次重新克隆） */
async function minimaxCloneSpeak(opts: {
  apiKey: string;
  text: string;
  sampleBase64: string;
  speed: number;
  emotion?: string;
  voice_modify?: { pitch?: number; intensity?: number; timbre?: number };
  root: string;
}): Promise<Buffer> {
  const cachePath = path.join(opts.root, 'node_modules', '.cache', 'ai-school-clone-voice.json');
  let cachedId = '';
  try {
    if (fs.existsSync(cachePath)) {
      const meta = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as { voice_id?: string };
      cachedId = String(meta.voice_id || '').trim();
    }
  } catch {
    /* ignore */
  }

  const tryTts = (voiceId: string) =>
    minimaxT2a({
      apiKey: opts.apiKey,
      text: opts.text,
      voiceId,
      model: 'speech-02-hd',
      speed: opts.speed,
      emotion: opts.emotion || 'happy',
      voice_modify: opts.voice_modify || { pitch: 10, intensity: -18, timbre: 22 },
    });

  if (cachedId) {
    try {
      return await tryTts(cachedId);
    } catch {
      cachedId = '';
    }
  }

  const bytes = base64ToBuffer(opts.sampleBase64);
  const form = new FormData();
  form.append('purpose', 'voice_clone');
  form.append('file', new Blob([new Uint8Array(bytes)], { type: 'audio/mpeg' }), 'sample.mp3');

  const uploadRes = await fetch(`${GATEWAY}/v1/files/upload`, {
    method: 'POST',
    headers: { 'X-Gateway-Authorization': `Bearer ${opts.apiKey}` },
    body: form,
  });
  if (!uploadRes.ok) throw new Error(`上传样本失败 ${uploadRes.status}`);
  const uploadJson = (await uploadRes.json()) as { file?: { file_id?: string }; file_id?: string };
  const fileId = String(uploadJson.file?.file_id || uploadJson.file_id || '');
  if (!fileId) throw new Error('样本上传无 file_id');

  const voiceId = STABLE_CLONE_VOICE_ID;
  const cloneRes = await fetch(`${GATEWAY}/v1/voice_clone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gateway-Authorization': `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      file_id: fileId,
      voice_id: voiceId,
      text: '你好，我是一人学校的老师，很高兴认识你。',
      model: 'speech-02-turbo',
    }),
  });
  if (!cloneRes.ok) {
    const err = await cloneRes.text().catch(() => '');
    throw new Error(`克隆失败 ${cloneRes.status}: ${err.slice(0, 160)}`);
  }

  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify({ voice_id: voiceId, at: Date.now() }), 'utf8');
  } catch {
    /* ignore */
  }

  return tryTts(voiceId);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function sendMp3(res: ServerResponse, buf: Buffer, via: string) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-School-TTS', via);
  res.end(buf);
}

async function handlePost(req: IncomingMessage, res: ServerResponse) {
  const root = pluginRoot();
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw || '{}') as {
      text?: string;
      voice?: string;
      rate?: string;
      pitch?: string;
      engine?: string;
      voice_id?: string;
      model?: string;
      speed?: number;
      emotion?: string;
      voice_modify?: { pitch?: number; intensity?: number; timbre?: number };
      sample_base64?: string;
      feature?: string;
      lang?: string;
    };

    const text = String(body.text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_CHARS);
    if (!text) {
      sendJson(res, 400, { error: 'text required' });
      return;
    }

    const forceEdge = String(body.engine || '').toLowerCase() === 'edge';
    const env = loadEnv(root);
    const disabled = String(env.MINIMAX_DISABLED || '') === '1' || String(env.TTS_PROVIDER || '').toLowerCase() === 'edge';
    const wantsMinimax = Boolean(body.voice_id || body.sample_base64) && !forceEdge && !disabled;
    const apiKey = integrationsKey(root);
    // 有独立 MiniMax key（非网关）时直连 api.minimaxi.com
    const direct = Boolean(env.MINIMAX_API_KEY) && !env.INTEGRATIONS_API_KEY;
    const mmBase = env.MINIMAX_API_BASE || 'https://api.minimaxi.com';
    const enVoice = env.TTS_VOICE_EN || 'English_Graceful_Lady';

    // 明确要超真人时：本地有密钥就合成；没有密钥则 503，让前端改走云端 tts-minimax（勿静默 Edge）
    if (wantsMinimax) {
      if (!apiKey) {
        sendJson(res, 503, { error: 'no local INTEGRATIONS_API_KEY', hint: 'use supabase tts-minimax' });
        return;
      }
      try {
        const speed = Number(body.speed ?? 1) || 1;
        if (body.sample_base64) {
          const buf = await minimaxCloneSpeak({
            apiKey,
            text,
            sampleBase64: String(body.sample_base64),
            speed,
            emotion: body.emotion,
            voice_modify: body.voice_modify,
            root,
          });
          sendMp3(res, buf, 'minimax:clone');
          return;
        }
        const isEnglish = String(body.lang || '').toLowerCase() === 'en' || !/[\u4e00-\u9fa5]/.test(text);
        const voiceId = String(body.voice_id || (isEnglish ? enVoice : 'female-shaonv')).trim() || 'female-shaonv';
        const model = String(body.model || 'speech-02-hd');
        const buf = await serializeTTS(() =>
          minimaxT2a({
            apiKey,
            direct,
            base: mmBase,
            text,
            voiceId,
            model,
            speed,
            emotion: isEnglish ? undefined : body.emotion || 'happy',
            voice_modify: body.voice_modify,
            english: isEnglish,
          }),
        );
        sendMp3(res, buf, `minimax:${voiceId}`);
        return;
      } catch (e) {
        sendJson(res, 502, {
          error: e instanceof Error ? e.message : 'minimax failed',
          hint: 'use supabase tts-minimax',
        });
        return;
      }
    }

    const isEnglishEdge = String(body.lang || '').toLowerCase() === 'en' || !/[\u4e00-\u9fa5]/.test(text);
    let voice = String(body.voice || '').trim();
    if (!/^[a-z]{2}-[A-Z]{2}-/.test(voice)) {
      voice = isEnglishEdge ? (env.EDGE_VOICE_EN || 'en-US-AriaNeural') : (env.EDGE_VOICE_ZH || 'zh-CN-XiaoxiaoNeural');
    }
    let rate = String(body.rate || '');
    if (!rate) {
      const sp = Number(body.speed || 1) || 1;
      const pct = Math.round((sp - 1) * 100);
      rate = (pct >= 0 ? '+' : '') + pct + '%';
    }
    // Edge 不能念 <#秒#>，转成省略号停顿
    const edgeText = text
      .replace(/<#\d+(?:\.\d+)?#>/g, (m) => {
        const sec = Number(m.slice(2, -2)) || 0.1;
        if (sec >= 0.28) return '…… ';
        if (sec >= 0.18) return '… ';
        return '，';
      })
      .replace(/\s+/g, ' ')
      .trim();
    const buf = await synthesizeEdgeMp3(edgeText, voice, rate, '+0Hz', root);
    sendMp3(res, buf, `edge:${voice}`);
  } catch (e) {
    sendJson(res, 500, { error: e instanceof Error ? e.message : 'tts failed' });
  }
}

function attach(middlewares: Connect.Server) {
  middlewares.use((req, res, next) => {
    const url = req.url?.split('?')[0] || '';
    if (url !== '/api/school-tts') {
      next();
      return;
    }
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.end();
      return;
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'POST only' });
      return;
    }
    void handlePost(req, res);
  });
}

export function schoolTtsPlugin(): Plugin {
  return {
    name: 'school-tts',
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}
