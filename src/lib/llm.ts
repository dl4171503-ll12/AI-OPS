import { SOCRATIC_POLICY, guardMentorReply } from './ops';
import type { AgeBand, TeacherTone } from './types';
import { agePromptHint, teacherToneHint } from './types';
import {
  effectiveSpeakTone,
  principalStyleHint,
  resolveGradeYear,
  teacherStyleHint,
  type GradeYear,
} from './grade-speak';
import type { StudentProfile } from './types';
import { teacherJapanContentPolicy } from './content-policy';

export async function schoolChat(opts: {
  system: string;
  mentor?: boolean;
  user: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  prefer?: 'deepseek' | 'kimi' | 'auto';
}): Promise<string> {
  const messages = [
    { role: 'system', content: opts.system + (opts.mentor ? '\n' + SOCRATIC_POLICY : '') },
    ...(opts.history || []),
    { role: 'user', content: opts.user },
  ];

  const res = await fetch('/api/school-llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 2800,
      prefer: opts.prefer ?? 'auto',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.detail || `AI 请求失败 ${res.status}`);
  }
  const content = String(data?.content || '').trim();
  if (!content) throw new Error('AI 返回为空');
  return opts.mentor ? guardMentorReply(content) : content;
}

type SpeakRole = 'principal' | 'teacher';

/** 注入年龄段 + 按年级强制的校长/老师语气（≤2 可亲切，≥3 正式）+ 全校内容边界 */
export function withAgeBand(
  system: string,
  band: AgeBand,
  tone?: TeacherTone,
  opts?: {
    role?: SpeakRole;
    gradeYear?: GradeYear;
    student?: Pick<StudentProfile, 'grade' | 'gradeYear'> | null;
  },
): string {
  const year = opts?.gradeYear ?? resolveGradeYear(opts?.student ?? null);
  const role = opts?.role || 'teacher';
  const effective = effectiveSpeakTone(year, tone, role);
  const roleHint = role === 'principal' ? principalStyleHint(year) : teacherStyleHint(year);
  return `${system}\n${role === 'teacher' ? SOCRATIC_POLICY : ''}\n\n【年龄段强制约束】${agePromptHint(band)}\n\n【说话风格·按年级】${roleHint}\n\n【语气档位】${teacherToneHint(effective)}（有效档位：${effective}；孩子年级：${year}）\n\n${teacherJapanContentPolicy()}`;
}

/** 尝试解析 JSON（允许包在 ```json 代码块中） */
export function extractJson<T = unknown>(text: string): T | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] || text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
