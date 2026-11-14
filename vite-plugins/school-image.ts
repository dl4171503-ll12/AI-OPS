/**
 * 图片生成代理（MiniMax image_generation）
 *
 * POST /api/school-image
 * body: { prompt, aspect_ratio?, n?, seed?, model? }
 * → { ok:true, model, images:[{ base64 }] }
 * 未配置 key → 501 { ok:false, code:'minimax-not-configured' }（不伪造图片）
 *
 * 环境变量：
 *   MINIMAX_API_KEY      （必填；也接受 VITE_MINIMAX_API_KEY）
 *   MINIMAX_API_BASE     （可选，默认 https://api.minimaxi.com；国际站用 https://api.minimax.io）
 *   MINIMAX_IMAGE_MODEL  （可选，默认 image-01）
 *   INTEGRATIONS_API_KEY （可选：走项目已有的集成网关）
 */
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

const GATEWAY = 'https://app-coce6zbtnke9-api-DLEO7Bj0lORa-gateway.appmiaoda.com';
const MAX_BODY = 64 * 1024;

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

export function schoolImagePlugin(): Plugin {
  return {
    name: 'school-image',
    configureServer(server) {
      const root = server.config.root || process.cwd();

      server.middlewares.use('/api/school-image', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, 405, { ok: false, code: 'method-not-allowed' });

        const env = loadEnv(root);
        const key = (env.MINIMAX_API_KEY || env.VITE_MINIMAX_API_KEY || '').trim();
        const gatewayKey = (env.INTEGRATIONS_API_KEY || env.VITE_INTEGRATIONS_API_KEY || '').trim();
        const base = (env.MINIMAX_API_BASE || 'https://api.minimaxi.com').replace(/\/+$/, '');
        const model = (env.MINIMAX_IMAGE_MODEL || 'image-01').trim();

        if (!key && !gatewayKey) {
          return sendJson(res, 501, {
            ok: false,
            code: 'minimax-not-configured',
            hint: '在 .env 配置 MINIMAX_API_KEY（或 INTEGRATIONS_API_KEY 走集成网关）后重启 dev server',
            where: 'https://platform.minimaxi.com/console （国际站 https://platform.minimax.io/console）',
          });
        }

        try {
          const raw = await readBody(req);
          const body = JSON.parse(raw || '{}');
          const prompt = String(body.prompt || '').trim();
          if (prompt.length < 4) return sendJson(res, 400, { ok: false, code: 'empty-prompt' });

          const payload: Record<string, unknown> = {
            model: String(body.model || model),
            prompt: prompt.slice(0, 1500),
            aspect_ratio: body.aspect_ratio || '4:3',
            response_format: 'base64',
            n: Math.min(4, Math.max(1, Number(body.n) || 1)),
          };
          if (Number.isFinite(Number(body.seed))) payload.seed = Number(body.seed);
          if (body.prompt_optimizer !== false) payload.prompt_optimizer = true;

          const url = key ? `${base}/v1/image_generation` : `${GATEWAY}/v1/image_generation`;
          const authKey = key || gatewayKey;

          const upstream = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authKey}` },
            body: JSON.stringify(payload),
          });
          const text = await upstream.text();
          let data: any = {};
          try { data = JSON.parse(text); } catch { /* keep text */ }
          if (!upstream.ok) {
            return sendJson(res, 502, {
              ok: false, code: 'upstream-error', status: upstream.status, detail: text.slice(0, 400),
            });
          }
          const code = data?.base_resp?.status_code;
          if (code && code !== 0) {
            return sendJson(res, 502, {
              ok: false, code: 'provider-error', providerCode: code,
              detail: data?.base_resp?.status_msg || 'provider returned non-zero status',
            });
          }
          const images = (data?.data?.image_base64 || data?.data?.image_urls || []).map((x: string) =>
            /^https?:\/\//i.test(x) ? { url: x } : { base64: x },
          );
          if (!images.length) return sendJson(res, 502, { ok: false, code: 'empty-image' });
          sendJson(res, 200, { ok: true, model: payload.model, count: images.length, images });
        } catch (e) {
          sendJson(res, 500, { ok: false, code: 'proxy-failed', detail: String(e instanceof Error ? e.message : e).slice(0, 300) });
        }
      });
    },
  };
}
