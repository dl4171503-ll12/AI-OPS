/**
 * 学习表现回传 → 主 Agent 评估 → 微调建议
 * POST /api/school-progress
 * body: { lesson:{title,focus,pct,correct,total}, student:{level,lex,ielts}, planWeek? }
 * → { ok:true, evaluation:{ fit:'too-hard|just-right|too-easy', advice, adjust:{difficulty:-1|0|1, review:[], nextFocus} } }
 * 未配置 key → 501；LLM 失败 → 规则兜底（不阻塞学习）
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
function ruleEval(pct: number) {
  if (pct < 50) return { fit: 'too-hard', advice: '这节课对你有点难，下次我们把文章换短一点、多复习一遍。', adjust: { difficulty: -1, review: ['本课错题'], nextFocus: 'listening' } };
  if (pct >= 90) return { fit: 'too-easy', advice: '这节课你掌握得很好，下次给你更难一点的材料。', adjust: { difficulty: 1, review: [], nextFocus: 'reading' } };
  return { fit: 'just-right', advice: '难度刚好，继续保持；错的题下次会再出现。', adjust: { difficulty: 0, review: ['本课错题'], nextFocus: '' } };
}

export function schoolProgressPlugin(): Plugin {
  return {
    name: 'school-progress',
    configureServer(server) {
      const root = server.config.root || process.cwd();
      server.middlewares.use('/api/school-progress', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, 405, { ok: false, code: 'method-not-allowed' });
        try {
          const body = JSON.parse((await readBody(req)) || '{}');
          const lesson = body.lesson || {};
          const pct = Number(lesson.pct);
          const pctSafe = Number.isFinite(pct) ? pct : 0;
          const fallback = ruleEval(pctSafe);

          const env = loadEnv(root);
          const key = (env.PLAN_API_KEY || env.DEEPSEEK_API_KEY || '').trim();
          const base = env.PLAN_API_BASE || env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
          const model = env.PLAN_MODEL || 'deepseek-chat';
          if (!key) {
            return sendJson(res, 200, { ok: true, evaluation: fallback, source: 'rule' });
          }
          try {
            const prompt = `你是学生的英语老师，请根据这节课的表现判断难度是否合适，并给出下一步微调。
学生：水平 ${body.student?.level || '—'}，蓝思 ${body.student?.lex || '—'}，雅思 ${JSON.stringify(body.student?.ielts || {})}
这节课：${lesson.title || '—'}，重点 ${lesson.focus || '—'}，正确率 ${pctSafe}%，答对 ${lesson.correct ?? '—'}/${lesson.total ?? '—'}
请只输出 JSON：{"fit":"too-hard|just-right|too-easy","advice":"给学生的一句中文话（30字内）","adjust":{"difficulty":-1|0|1,"review":["要复习的内容"],"nextFocus":"listening|reading|speaking|writing|mixed"}}`;
            const r = await fetch(base.replace(/\/+$/, '') + '/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 300,
                response_format: { type: 'json_object' },
              }),
            });
            const text = await r.text();
            if (!r.ok) throw new Error('llm ' + r.status);
            const data = JSON.parse(text);
            const content = data?.choices?.[0]?.message?.content || '';
            const jm = content.match(/\{[\s\S]*\}/);
            const evaluation = jm ? JSON.parse(jm[0]) : fallback;
            sendJson(res, 200, { ok: true, evaluation, source: jm ? 'llm' : 'rule' });
          } catch {
            sendJson(res, 200, { ok: true, evaluation: fallback, source: 'rule' });
          }
        } catch (e) {
          sendJson(res, 500, { ok: false, code: 'progress-failed', detail: String(e instanceof Error ? e.message : e).slice(0, 200) });
        }
      });
    },
  };
}
