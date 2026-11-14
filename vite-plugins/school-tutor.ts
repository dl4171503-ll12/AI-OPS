/**
 * AI 老师课堂接口：带学生档案的对话式教学
 * POST /api/school-tutor
 * body: { mode:'start'|'reply'|'feedback', profile, lesson, history?, studentText?, expected? }
 * → { ok:true, reply:string, verdict?:'right|partly|wrong' }
 * 未配置 key → 501；失败 → 502（前端有模板兜底）
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

const PERSONA = `You are a patient English teacher for an 8-10 year old Chinese learner. You teach mostly by SPEAKING with him, in short simple English at his level.
Rules:
- SPEAKING-FIRST: every turn he should answer by speaking; do not ask him to type unless it is a spelling/dictation/grammar/writing task.
- Use language he can understand (his Lexile/CEFR level). One idea per sentence.
- If he says he does not understand or gives a confused/no answer: repeat more slowly, simplify to one question, give one example, then ask again. Use ONE very short Chinese phrase only as a last resort.
- Correction loop: recast the correct sentence, ask him to say it once more, then move on.
- 2-4 short sentences per turn; one question at a time; praise specifically; never output JSON; no technical words.`;

function profileText(p: any): string {
  if (!p) return '(no assessment data)';
  const ielts = p.ielts || {};
  return `Grade ${p.grade || '—'}; Lexile level ${p.level || '—'} (${p.lex || '—'}L); IELTS L/S/R/W ${ielts.listen ?? '—'}/${ielts.speak ?? '—'}/${ielts.read ?? '—'}/${ielts.write ?? '—'}; weakest skill ${p.weakest || '—'}.`;
}

export function schoolTutorPlugin(): Plugin {
  return {
    name: 'school-tutor',
    configureServer(server) {
      const root = server.config.root || process.cwd();
      server.middlewares.use('/api/school-tutor', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, 405, { ok: false, code: 'method-not-allowed' });
        const env = loadEnv(root);
        const key = (env.PLAN_API_KEY || env.DEEPSEEK_API_KEY || '').trim();
        const base = env.PLAN_API_BASE || env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
        const model = env.PLAN_MODEL || 'deepseek-chat';
        if (!key) return sendJson(res, 501, { ok: false, code: 'tutor-not-configured' });
        try {
          const b = JSON.parse((await readBody(req)) || '{}');
          const mode = String(b.mode || 'reply');
          const profile = profileText(b.profile);
          const lesson = b.lesson || {};
          const lessonContext = `\nBook pages: ${b.lesson && b.lesson.pages ? b.lesson.pages : (b.lesson && b.lesson.context) || ''}`;
          const expected = b.expected != null ? String(b.expected) : '';
          const studentText = b.studentText != null ? String(b.studentText) : '';
          const nextQuestion = b.nextQuestion != null ? String(b.nextQuestion) : '';
          const supervision = String(b.supervision || '');
          const suspicious = String(b.suspicious || '');
          let supDirective = '';
          if (supervision === 'lower') supDirective += '\nSupervisor note: the student regressed last lesson. Lower difficulty, speak slower, rephrase the question, give more scaffolding.';
          if (supervision === 'raise') supDirective += '\nSupervisor note: the student improved. Add a small challenge to keep him engaged.';
          if (suspicious) supDirective += `\nSupervision flag: possible copying/AI-assistance (${suspicious}). Before accepting, ask him to explain the answer in his own words.`;
          const history = Array.isArray(b.history) ? b.history.slice(-8) : [];

          let userPrompt = '';
          if (mode === 'explain') {
            const wrongs = Array.isArray(b.wrongs) ? b.wrongs.slice(0, 5).map((w: any) => `${w.q || ''} → correct: ${w.answer || ''}`).join('; ') : '';
            userPrompt = `The student just finished the stage quiz and made these mistakes: ${wrongs || '(none)'}.
Reply IN ENGLISH in 3-5 short sentences: for each mistake, state the correct answer and give one tiny example. Then say you will practise them again. Do NOT ask any question in this turn.${lessonContext}${supDirective}`;
          } else if (mode === 'start') {            userPrompt = `Start the class IN ENGLISH: greet him warmly, say what you will practise today ("${lesson.title || 'English'}", focus: ${lesson.focus || 'speaking'}), then ask ONE open question that makes him speak (not a yes/no question).${lessonContext}${supDirective}
Suggested first question: ${lesson.question || 'Tell me about your day.'}`;
          } else if (mode === 'feedback') {
            userPrompt = `The lesson is over. He got ${b.correct ?? 0}/${b.total ?? 0} right. In ENGLISH (3 short sentences): praise something specific, mention one thing to fix, and tell him what you will practise next time. Add one short Chinese sentence only to make sure the parent understands.`;
          } else if (b.retry) {
            userPrompt = `He just tried again after your correction. His retry: "${studentText || ''}". Praise briefly, then ASK THE NEXT QUESTION below (do not repeat the old one).
Current practice: ${lesson.question || ''} (reference: ${expected || 'open question'})
NEXT question to ask: ${nextQuestion || '(finish the lesson)'}${lessonContext}`;
          } else if (String(b.verdict || '') === 'unclear') {
            userPrompt = `He says he does not understand (or gave no clear answer). Do NOT move on. Repeat the same question in simpler, slower English, give one short example, then ask again.
Current practice: ${lesson.question || ''} (reference: ${expected || 'open question'})${lessonContext}`;
          } else {
            const verdict = String(b.verdict || '').trim();
            userPrompt = `Current practice: ${lesson.question || ''}
Reference answer: ${expected || '(open question - judge by meaning)'}
His answer: "${studentText || '(no answer)'}"
You judged it as: ${verdict || 'unknown'}.
Reply IN ENGLISH in 2-4 short sentences: if right, praise then ask the NEXT question; if wrong or partly right, recast the correct sentence and ask him to say it once more (do not move on yet).
NEXT question to ask after feedback: ${nextQuestion || '(this is the last question - tell him we are almost done)'}
Do NOT repeat the current practice question when it is already correct.${lessonContext}${supDirective}`;
          }

          const messages = [
            { role: 'system', content: PERSONA + `\n学生档案：${profile}` },
            ...history.map((h: any) => ({ role: h.role === 'teacher' ? 'assistant' : 'user', content: String(h.content || '').slice(0, 500) })),
            { role: 'user', content: userPrompt },
          ];
          const r = await fetch(base.replace(/\/+$/, '') + '/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
            body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 260 }),
          });
          const text = await r.text();
          if (!r.ok) throw new Error('llm ' + r.status);
          const data = JSON.parse(text);
          const reply = String(data?.choices?.[0]?.message?.content || '').trim();
          if (!reply) throw new Error('empty reply');
          sendJson(res, 200, { ok: true, reply });
        } catch (e) {
          sendJson(res, 502, { ok: false, code: 'tutor-failed', detail: String(e instanceof Error ? e.message : e).slice(0, 160) });
        }
      });
    },
  };
}
