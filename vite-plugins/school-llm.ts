/**
 * AI 调用代理：读取 .env 中的 DeepSeek / Kimi，供学校各角色使用。
 * POST /api/school-llm  { messages, temperature?, max_tokens? }
 */
import type { Plugin, Connect } from 'vite';
import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

function loadEnv(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const p = path.join(root, '.env');
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return out;
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

async function chat(baseUrl: string, apiKey: string, model: string, messages: unknown[], temperature: number, max_tokens: number) {
  const base = baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens, stream: false }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LLM ${res.status}: ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  const content = String(data?.choices?.[0]?.message?.content ?? '').trim();
  if (!content) throw new Error('empty LLM content');
  return content;
}

function attach(middlewares: Connect.Server, root: string) {
  middlewares.use(async (req, res, next) => {
    const url = req.url?.split('?')[0] || '';
    if (url !== '/api/school-llm' || req.method !== 'POST') {
      next();
      return;
    }
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const messages = body.messages;
      if (!Array.isArray(messages) || !messages.length) {
        sendJson(res, 400, { error: '缺少 messages' });
        return;
      }
      const env = loadEnv(root);
      const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
      const max_tokens = typeof body.max_tokens === 'number' ? body.max_tokens : 2500;
      const dsKey = env.DEEPSEEK_API_KEY || env.VITE_DEEPSEEK_API_KEY || '';
      const dsBase = env.DEEPSEEK_BASE_URL || env.VITE_DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
      const kimiKey = env.KIMI_API_KEY || env.MOONSHOT_API_KEY || env.DEEPSEEK_API_KEY_BACKUP || '';

      if (dsKey) {
        try {
          const content = await chat(dsBase, dsKey, 'deepseek-chat', messages, temperature, max_tokens);
          sendJson(res, 200, { content, source: 'deepseek' });
          return;
        } catch (e) {
          console.warn('[school-llm] deepseek failed', e);
        }
      }
      if (kimiKey) {
        try {
          const content = await chat('https://api.moonshot.cn/v1', kimiKey, 'moonshot-v1-32k', messages, temperature, max_tokens);
          sendJson(res, 200, { content, source: 'kimi' });
          return;
        } catch (e) {
          console.warn('[school-llm] kimi failed', e);
        }
      }
      sendJson(res, 502, { error: 'AI 服务不可用：请检查 DEEPSEEK_API_KEY / DEEPSEEK_API_KEY_BACKUP' });
    } catch (e) {
      sendJson(res, 500, { error: e instanceof Error ? e.message : 'school-llm error' });
    }
  });
}

export function schoolLlmPlugin(): Plugin {
  return {
    name: 'school-llm-proxy',
    configureServer(server) {
      attach(server.middlewares, server.config.root);
    },
    configurePreviewServer(server) {
      attach(server.middlewares, server.config.root);
    },
  };
}
