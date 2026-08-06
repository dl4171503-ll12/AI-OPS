import type { AgeBand } from './types';
import { agePromptHint } from './types';

export async function schoolChat(opts: {
  system: string;
  user: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const messages = [
    { role: 'system', content: opts.system },
    ...(opts.history || []),
    { role: 'user', content: opts.user },
  ];

  const res = await fetch('/api/school-llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 2500,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `AI 请求失败 ${res.status}`);
  }
  const content = String(data?.content || '').trim();
  if (!content) throw new Error('AI 返回为空');
  return content;
}

export function withAgeBand(system: string, band: AgeBand): string {
  return `${system}\n\n【年龄段强制约束】${agePromptHint(band)}`;
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
