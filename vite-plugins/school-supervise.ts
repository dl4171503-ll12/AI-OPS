/**
 * 监督 Agent 接口：判断能否下课 / 降难度 / 提难度（DeepSeek）
 * POST /api/school-supervise
 * body: { state:{ idx, total, elapsedSec, minSec, correct, flags, lesson }, profile }
 * → { ok:true, decision:'continue|end|lower|raise', reason, extraPractice }
 */
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

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
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function schoolSupervisePlugin(): Plugin {
  return {
    name: 'school-supervise',
    configureServer(server) {
      const root = server.config.root || process.cwd();
      server.middlewares.use('/api/school-supervise', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, 405, { ok: false, code: 'method-not-allowed' });
        const env = loadEnv(root);
        const key = (env.PLAN_API_KEY || env.DEEPSEEK_API_KEY || '').trim();
        const base = (env.PLAN_API_BASE || 'https://api.deepseek.com').replace(/\/+$/, '');
        const model = env.PLAN_MODEL || 'deepseek-chat';
        try {
          const b = JSON.parse((await readBody(req)) || '{}');
          const s = b.state || {};
          const idx = Number(s.idx || 0);
          const total = Number(s.total || 0);
          const elapsed = Number(s.elapsedSec || 0);
          const minSec = Number(s.minSec || 0);
          const pct = total ? Math.round((Number(s.correct || 0) / total) * 100) : 0;
          const flags = s.flags ? String(s.flags) : '';
          // 规则兜底：内容没学完/时间没到，一律不能结束
          const ruleDecision = idx >= total && elapsed >= minSec ? 'end' : 'continue';
          if (!key) {
            return sendJson(res, 200, { ok: true, decision: ruleDecision, reason: '规则监督（未配置大模型密钥）', extraPractice: 0 });
          }
          const prompt = `你是英语课堂的监督 Agent，监督一个 8-10 岁学生。铁律：
1. 学生不能自己结束课程；只有全部题目完成且达到最短学习时长才允许 end。
2. 学生退步/连续错 → lower（老师降难度、换说法）；表现好 → raise（提高挑战）。
3. 存在可疑行为（flags 非空）→ continue，并让老师要求口头解释。
4. 必须输出 JSON：{"decision":"continue|end|lower|raise","reason":"简短中文","extraPractice":0 或 1}
状态：已完成 ${idx}/${total} 题；已用时 ${Math.round(elapsed/60)} 分钟（最短 ${Math.round(minSec/60)} 分钟）；正确率 ${pct}%；可疑标记：${flags || '无'}；课程：${s.lesson || ''}
规则判定参考：${ruleDecision}。只输出 JSON，不要其他文字。`;
          const r = await fetch(base + '/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
            body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 160, response_format: { type: 'json_object' } }),
          });
          if (!r.ok) throw new Error('llm ' + r.status);
          const data: any = await r.json();
          const text = String(data?.choices?.[0]?.message?.content || '{}');
          let parsed: any = {};
          try { parsed = JSON.parse(text); } catch {}
          let decision = ['continue', 'end', 'lower', 'raise'].includes(parsed.decision) ? parsed.decision : ruleDecision;
          // 安全护栏：内容/时长不足时不允许 end/lower/raise 越权结束
          if (ruleDecision !== 'end' && decision === 'end') decision = 'continue';
          if (ruleDecision === 'end') decision = 'end';
          sendJson(res, 200, { ok: true, decision, reason: String(parsed.reason || ''), extraPractice: Number(parsed.extraPractice || 0) });
        } catch (e) {
          sendJson(res, 502, { ok: false, code: 'supervise-failed', detail: String(e instanceof Error ? e.message : e).slice(0, 160) });
        }
      });
    },
  };
}
