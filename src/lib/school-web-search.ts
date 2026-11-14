import { schoolChat, withAgeBand } from './llm';
import type { AgeBand, SubjectId, TeacherTone } from './types';

export type SchoolSearchItem = {
  title: string;
  url: string;
  snippet: string;
  source: 'web' | 'news' | 'video' | 'wiki' | 'article';
};

export type MaterialsPack = {
  engine: 'deepseek' | 'kimi';
  query: string;
  summary: string;
  items: SchoolSearchItem[];
};

/** DeepSeek ↔ Kimi 轮番：偶数次 DeepSeek，奇数次 Kimi */
let rotateSeq = 0;

export function nextSearchEngine(): 'deepseek' | 'kimi' {
  const eng = rotateSeq % 2 === 0 ? 'deepseek' : 'kimi';
  rotateSeq += 1;
  return eng;
}

export function buildMaterialsQuery(
  subject: SubjectId,
  topic: string,
  gradeHint: string,
  trackLabel?: string,
): string {
  const t = topic.replace(/\s+/g, ' ').trim().slice(0, 120) || '基础巩固';
  const track = trackLabel ? `${trackLabel} ` : '';
  const map: Record<SubjectId, string> = {
    math: `${t} 小学数学 教学视频 讲解 ${gradeHint}`,
    chinese: `${track}${t} 教学视频 讲解 课文 史料 地图 ${gradeHint}`,
    english: `${t} English learning teaching video kids ${gradeHint}`,
    science: `${track}${t} 实验 教学 虚拟实验 科普视频 ${gradeHint}`,
    art: `${t} 美术 教程 视频 ${gradeHint}`,
    pe: `${t} 体育 动作 教学视频 ${gradeHint}`,
    ai: `${t} AI 人工智能 提示词 教程 教学视频 ${gradeHint}`,
  };
  return map[subject] || `${t} 学习 教学视频`;
}

export async function searchSchoolWeb(opts: {
  query: string;
  subject: string;
  kinds?: Array<'web' | 'news' | 'video' | 'wiki'>;
}): Promise<{ ok: boolean; items: SchoolSearchItem[]; query: string; error?: string }> {
  const query = opts.query.trim();
  if (!query) return { ok: false, items: [], query, error: '搜索词不能为空' };

  const res = await fetch('/api/school-web-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      subject: opts.subject,
      kinds: opts.kinds || ['web', 'news', 'video', 'wiki'],
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    items?: SchoolSearchItem[];
    query?: string;
    error?: string;
  };
  if (!res.ok) {
    return { ok: false, items: [], query, error: data.error || `搜索失败 ${res.status}` };
  }
  return {
    ok: Boolean(data.ok && (data.items?.length || 0) > 0),
    items: data.items || [],
    query: data.query || query,
    error: data.error,
  };
}

function formatItems(items: SchoolSearchItem[], query: string): string {
  if (!items.length) {
    return `【外网检索】查询：${query}\n（暂无结果，请给出可复制的 B站/YouTube 搜索词，禁止编造链接）`;
  }
  const lines = items.slice(0, 12).map((it, i) => {
    const tag =
      it.source === 'video'
        ? '视频'
        : it.source === 'news'
          ? '新闻'
          : it.source === 'wiki'
            ? '百科'
            : '网页';
    return `${i + 1}. [${tag}] ${it.title}\n   链接：${it.url}\n   摘要：${it.snippet || '（无）'}`;
  });
  return [`【外网检索结果】查询：${query}`, ...lines].join('\n');
}

/** 上网检索 + DeepSeek/Kimi 轮番整理「可观看」学习资料 */
export async function fetchLatestMaterials(opts: {
  subject: SubjectId;
  subjectName: string;
  teacherName: string;
  topic: string;
  ageBand: AgeBand;
  gradeLabel: string;
  weaknesses?: string[];
  teacherTone?: TeacherTone;
  trackLabel?: string;
}): Promise<MaterialsPack> {
  const engine = nextSearchEngine();
  const query = buildMaterialsQuery(
    opts.subject,
    opts.topic || opts.weaknesses?.[0] || '今日重点',
    opts.gradeLabel,
    opts.trackLabel,
  );
  const searched = await searchSchoolWeb({
    query,
    subject: opts.subject,
    kinds: ['web', 'video', 'wiki', 'news'],
  });

  const context = formatItems(searched.items, searched.query || query);
  const summary = await schoolChat({
    prefer: engine,
    temperature: 0.55,
    max_tokens: 1600,
    system: withAgeBand(
      `你是「${opts.teacherName}」，${opts.subjectName}老师。根据外网检索结果，为学生整理「最新可观看学习资料」。
要求：
1) 用简短中文，先给 3～6 条推荐（优先视频：B站/YouTube 等真实链接）
2) 每条必须使用检索结果里出现的真实 URL，禁止编造
3) 说明适合怎么看（时长建议、看完做什么练习）
4) 末尾注明本次整理引擎：${engine === 'deepseek' ? 'DeepSeek' : 'Kimi'}`,
      opts.ageBand,
      opts.teacherTone,
    ),
    user: `弱项：${opts.weaknesses?.join('、') || '综合'}。主题：${opts.topic || '巩固'}。\n${context}`,
  });

  return {
    engine,
    query: searched.query || query,
    summary,
    items: searched.items,
  };
}
