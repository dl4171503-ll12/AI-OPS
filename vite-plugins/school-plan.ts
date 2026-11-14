/**
 * AI 老师教案（服务端）：模板 → 个性化定稿 → 学习中微调
 * POST /api/school-plan
 * body:
 *   { mode:'template', level, grade }
 *   { mode:'personalize', level, grade, report }
 *   { mode:'adjust', plan, feedback:{ lessonTitle, focus, pct } }
 * → { ok:true, plan:{ teacherNote, weeks:[{n,title,focus,lessons:[{n,title,focus}]}], books, review } }
 * 未配置 key → 501；解析失败 → 502。学生界面不出现任何技术细节。
 */
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

const MAX_BODY = 256 * 1024;

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

const SCHEMA = `{
  "teacherNote": "老师写给学生的一句鼓励+本次重点（中文，30字以内）",
  "weeks": [
    { "n": 1, "title": "第1周主题（中文）", "focus": "listening|reading|speaking|writing|mixed",
      "lessons": [ { "n": 1, "title": "第1课（中文）", "focus": "listening|reading|speaking|writing|mixed" } ] }
  ],
  "books": "推荐阅读的蓝思范围，例如 300L – 450L",
  "review": ["需要复习的具体内容（中文，1-3条）"]
}`;

const SYSTEM = `你是一位经验丰富的少儿英语老师，正在为学生写学习教案。
要求：
1. 只用中文写给学生看的教学习内容，不要出现任何技术、软件、模型、接口相关的词。
2. 教案要具体、可执行：每周重点、每课目标、练什么。
3. 严格输出 JSON，不要输出解释、不要代码块标记。JSON 结构：${SCHEMA}
4. 共 4 周，每周 3 课。`;

async function callLLM(key: string, base: string, model: string, userPrompt: string): Promise<any> {
  const res = await fetch(base.replace(/\/+$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`llm ${res.status}: ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  const content = data?.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('no json in response');
  return JSON.parse(jsonMatch[0]);
}

export function schoolPlanPlugin(): Plugin {
  return {
    name: 'school-plan',
    configureServer(server) {
      const root = server.config.root || process.cwd();
      server.middlewares.use('/api/school-plan', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, 405, { ok: false, code: 'method-not-allowed' });
        const env = loadEnv(root);
        const key = (env.PLAN_API_KEY || env.DEEPSEEK_API_KEY || '').trim();
        const base = env.PLAN_API_BASE || env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
        const model = env.PLAN_MODEL || 'deepseek-chat';
        if (!key) {
          return sendJson(res, 501, { ok: false, code: 'plan-not-configured' });
        }
        try {
          const body = JSON.parse((await readBody(req)) || '{}');
          const mode = String(body.mode || 'personalize');
          const level = String(body.level || '中级');
          const grade = String(body.grade || '');
          let prompt = '';
          if (mode === 'template') {
            prompt = `请先写一个通用教案模板：学生水平「${level}」，年级「${grade}」。给出 4 周每周主题与每课标题，不针对具体分数。只输出 JSON。`;
          } else if (mode === 'adjust') {
            const plan = body.plan || {};
            const fb = body.feedback || {};
            prompt = `这是学生当前教案：${JSON.stringify(plan).slice(0, 2500)}。
学生在「${fb.lessonTitle || '本课'}」表现：正确率 ${Number(fb.pct) || 0}%，重点「${fb.focus || ''}」。
请据此调整后面 4 周教案：太难就降低难度、增加复习；太简单就提高难度、增加挑战。teacherNote 要解释调整原因（对学生说的话）。只输出 JSON。`;
          } else {
            const r = body.report || {};
            const cur = body.curriculum || {};
            const tpl = body.template ? `参考老师先前写好的教案模板：${JSON.stringify(body.template).slice(0, 1600)}。` : '';
            const curLine = cur.targets
              ? `- 本级课程目标（必须对齐）：CEFR ${cur.cefr || '—'}，雅思 ${cur.ieltsRange || '—'}；听/说/读/写目标 ${cur.targets.listen}/${cur.targets.speak}/${cur.targets.read}/${cur.targets.write}；词汇约 ${cur.words || '—'}；语法 ${cur.grammar || '—'}；听力要求 ${cur.listeningSpec || '—'}；口语形式 ${cur.speakingSpec || '—'}；写作要求 ${cur.writingSpec || '—'}；结课标准 ${cur.exitRule || '—'}。`
              : '';
            prompt = `请根据学生的测评报告写最终教案：
- 年级：${grade || '未填写'}
- 水平：${level}
- 雅思预估：听力 ${r.listen ?? '—'}、口语 ${r.speak ?? '—'}、阅读 ${r.read ?? '—'}、写作 ${r.write ?? '—'}，整体 ${r.overall ?? '—'}（CEFR ${r.cefr || '—'}）
- 蓝思：${r.lex ?? '—'}
${curLine}
- 最弱项：${r.weakest || '—'}；错题听写：${(r.dictWrong || []).slice(0, 5).join(' / ') || '无'}
${tpl}
教案要针对最弱项安排前两周重点，第三四周巩固复习；books 给出推荐蓝思范围；review 给出具体复习清单。第1课要能立刻开始练。只输出 JSON。`;
          }
          const plan = await callLLM(key, base, model, prompt);
          sendJson(res, 200, { ok: true, plan });
        } catch (e) {
          sendJson(res, 502, { ok: false, code: 'plan-failed', detail: String(e instanceof Error ? e.message : e).slice(0, 200) });
        }
      });
    },
  };
}
