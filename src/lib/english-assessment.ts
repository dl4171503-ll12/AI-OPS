/**
 * 英语单科入学测评引擎（English Admission Assessment）
 *
 * 设计目标：把"英语"从 40 项综合入学测评里单独拎出来，做成一次可判定的分档测评。
 * - 四项技能：listening（听说·听）/ speaking（口语）/ reading（读写·读）/ writing（读写·写）
 * - 四个档位：beginner 初级(1-3年级) / intermediate 中级(4-6年级)
 *             ielts-prep 雅思预备(初一-初三) / advanced 高级(雅思初阶段 5.0-5.5)
 * - 自适应：按年级给起点，答对升一档、答错降一档，每个技能最多 3 题
 * - 雅思预备档额外测"雅思四单项是否具备开始真题练习的水平"
 *
 * 诚实边界（写进报告，不许遮掩）：
 * - 浏览器 Web Speech API 只能拿到转写文本，无法做音素级发音评分。
 *   因此口语分 = "转写文本可判定维度"（信息覆盖/长度/句法/衔接），
 *   发音(pronunciation)单独标为"待接入语音评测或人工复核"，不计入分数。
 */

export type EnglishSkill = 'listening' | 'speaking' | 'reading' | 'writing';

export type EnglishBandId = 'beginner' | 'intermediate' | 'ielts-prep' | 'advanced';

export interface EnglishBand {
  id: EnglishBandId;
  label: string;
  gradeLabel: string;
  cefr: string;
  /** 对标中国义务教育英语课标分级 */
  curriculum: string;
  /** 参考词汇量（区间来自公开标准，最终以教研核定为准） */
  vocab: string;
  ielts?: string;
  summary: string;
}

export const ENGLISH_BANDS: EnglishBand[] = [
  {
    id: 'beginner',
    label: '初级',
    gradeLabel: '小学 1–3 年级',
    cefr: 'A1（Pre-A1 起步）',
    curriculum: '课标一级',
    vocab: '剑桥 Starters+Movers 累计约 818 词（官方词表统计）',
    summary: '能听懂并说出身边事物的简单词句，能读配图短句，能写 1–2 个简单句。',
  },
  {
    id: 'intermediate',
    label: '中级',
    gradeLabel: '小学 4–6 年级',
    cefr: 'A2',
    curriculum: '课标二级',
    vocab: '剑桥 Flyers 累计约 1,297 词（官方词表统计）',
    summary: '能听懂日常对话要点，能就熟悉话题连续说 3–5 句，能读短篇并找信息，能写 3–5 句连贯短文。',
  },
  {
    id: 'ielts-prep',
    label: '雅思预备',
    gradeLabel: '初一 – 初三',
    cefr: 'B1',
    curriculum: '课标三级 / 中考水平',
    vocab: '剑桥 A2 Key 词表（待统计）',
    ielts: '目标 IELTS 4.5 – 5.0',
    summary: '能听懂带转折的对话与短文，能就熟悉话题表达观点并给理由，能读 150 词左右文章做推断，能写 80 词以上有结构的短文。',
  },
  {
    id: 'advanced',
    label: '高级',
    gradeLabel: '雅思初阶段',
    cefr: 'B2',
    curriculum: '课标三级+ / 雅思初阶段',
    vocab: '剑桥 B1 Preliminary 词表（待统计）',
    ielts: '目标 IELTS 5.0 – 5.5',
    summary: '能听懂学术/半学术讲座要点，能就抽象话题连续表达 60 秒以上，能读 250 词论述文并识别立场，能写 150 词以上论证段落。',
  },
];

export function bandById(id: EnglishBandId): EnglishBand {
  return ENGLISH_BANDS.find((b) => b.id === id) || ENGLISH_BANDS[0];
}

export function bandIndex(id: EnglishBandId): number {
  return ENGLISH_BANDS.findIndex((b) => b.id === id);
}

/** 按年级给起始档位（只是起点，最终档位由作答决定） */
export function startBandForGrade(gradeYear: number): EnglishBandId {
  const y = Number.isFinite(gradeYear) ? Math.round(gradeYear) : 3;
  if (y <= 3) return 'beginner';
  if (y <= 6) return 'intermediate';
  if (y <= 9) return 'ielts-prep';
  return 'advanced';
}

export interface EnglishItem {
  id: string;
  skill: EnglishSkill;
  band: EnglishBandId;
  /** 中文作答说明，给孩子看 */
  instruction: string;
  /** 听力/口语/朗读的英文播放文本（走服务端 TTS） */
  audioText?: string;
  /** 阅读材料 */
  passage?: string;
  question: string;
  /** 选择题选项；为空表示开放作答（口语转写/写作） */
  options?: string[];
  answer?: string;
  /** 写作/口语最少词数 */
  minWords?: number;
  /** 期望出现的关键信息词（用于可判定评分） */
  targets?: string[];
  /** 该题是否属于雅思能力判定题 */
  ieltsSkill?: 'listening' | 'reading' | 'writing' | 'speaking';
  /** 判分维度权重，合计 1 */
  rubric: Array<{ dimension: string; weight: number }>;
}

/**
 * 题库：每个技能 × 每档 1 题（原创示例题，非真题）。
 * 自适应规则下每个技能最多考 3 档，所以 16 题足够覆盖。
 */
export const ENGLISH_ITEMS: EnglishItem[] = [
  // ================= listening 听说·听 =================
  {
    id: 'en-listen-b1',
    skill: 'listening',
    band: 'beginner',
    instruction: '点播放，听两遍，然后选答案。',
    audioText: 'Hi, I am Mia. I have a red bag and two books. I go to school by bus.',
    question: 'What colour is Mia’s bag?',
    options: ['Blue', 'Red', 'Green'],
    answer: 'Red',
    rubric: [{ dimension: '关键信息', weight: 1 }],
  },
  {
    id: 'en-listen-b2',
    skill: 'listening',
    band: 'intermediate',
    instruction: '点播放，听两遍，然后选答案。',
    audioText:
      'Every Saturday, Lily goes to the library with her brother. They read for an hour, and then they walk home together.',
    question: 'How often does Lily go to the library?',
    options: ['Every Sunday', 'Every Saturday', 'Twice a week', 'On school days'],
    answer: 'Every Saturday',
    rubric: [{ dimension: '关键信息', weight: 1 }],
  },
  {
    id: 'en-listen-b3',
    skill: 'listening',
    band: 'ielts-prep',
    instruction: '点播放，听两遍，然后选最符合原文的一项。',
    audioText:
      'In many cities, cycling lanes have been expanded. Supporters say this reduces traffic and pollution. However, some drivers argue that the new lanes make roads narrower and slower for cars.',
    question: 'What is the main disagreement about?',
    options: [
      'Whether cars should be banned in cities',
      'How much a new cycling lane costs',
      'Whether expanding cycling lanes is a good idea',
      'When the cycling lanes will be finished',
    ],
    answer: 'Whether expanding cycling lanes is a good idea',
    rubric: [{ dimension: '观点识别', weight: 1 }],
  },
  {
    id: 'en-listen-b4',
    skill: 'listening',
    band: 'advanced',
    instruction: '点播放，听两遍，然后选最能概括说话人态度的一项。',
    audioText:
      'The idea that technology makes us less creative is, I think, too simple. True, a search engine can answer questions instantly. But the people who invent new ways to use these tools are not less imaginative — they are working with a much larger box of materials than we had twenty years ago.',
    question: 'What is the speaker’s attitude towards the claim that technology reduces creativity?',
    options: [
      'She completely agrees with it',
      'It is too simple and she partly disagrees',
      'She thinks it only applies to children',
      'She refuses to express an opinion',
    ],
    answer: 'It is too simple and she partly disagrees',
    rubric: [{ dimension: '态度推断', weight: 1 }],
  },

  // ================= speaking 口语 =================
  {
    id: 'en-speak-b1',
    skill: 'speaking',
    band: 'beginner',
    instruction: '看图片描述：一只猫和一个球。用英语说 2 句话（至少 6 个词）。',
    question: 'Say two sentences about the cat and the ball.',
    audioText: 'Look at the picture. There is a cat and a ball. What do you see?',
    minWords: 6,
    targets: ['cat', 'ball'],
    rubric: [
      { dimension: '信息覆盖', weight: 0.5 },
      { dimension: '基本句法', weight: 0.5 },
    ],
  },
  {
    id: 'en-speak-b2',
    skill: 'speaking',
    band: 'intermediate',
    instruction: '说 3 句话介绍你最喜欢的食物：它是什么、什么时候吃、为什么喜欢。至少 20 个词。',
    question: 'Talk about your favourite food in three sentences.',
    audioText: 'Tell me about your favourite food. What is it? When do you eat it? Why do you like it?',
    minWords: 20,
    targets: ['like', 'because'],
    rubric: [
      { dimension: '信息覆盖', weight: 0.4 },
      { dimension: '句法与词汇', weight: 0.4 },
      { dimension: '衔接连贯', weight: 0.2 },
    ],
  },
  {
    id: 'en-speak-b3',
    skill: 'speaking',
    band: 'ielts-prep',
    instruction: '雅思 Part 2 风格：描述一门你觉得难的学科，尽量连续说 40–60 秒。',
    question: 'Describe a subject you find difficult. Say what it is, why it is difficult, and what you do about it.',
    audioText: 'Describe a subject you find difficult. You should say what the subject is, why you find it difficult, and what you do to deal with it.',
    minWords: 45,
    targets: ['difficult', 'because', 'try'],
    rubric: [
      { dimension: '信息覆盖', weight: 0.35 },
      { dimension: '句法与词汇', weight: 0.35 },
      { dimension: '衔接连贯', weight: 0.3 },
    ],
  },
  {
    id: 'en-speak-b4',
    skill: 'speaking',
    band: 'advanced',
    instruction: '雅思 Part 3 风格：科技让人更有创造力还是更没创造力？连续说 60 秒以上，给出理由和例子。',
    question: 'Do you think technology has made people more or less creative? Give reasons and examples.',
    audioText: 'Do you think technology has made people more creative, or less creative? Please give reasons and examples.',
    minWords: 70,
    targets: ['because', 'example', 'think'],
    rubric: [
      { dimension: '信息覆盖', weight: 0.3 },
      { dimension: '句法与词汇', weight: 0.35 },
      { dimension: '衔接连贯', weight: 0.35 },
    ],
  },

  // ================= reading 读写·读 =================
  {
    id: 'en-read-b1',
    skill: 'reading',
    band: 'beginner',
    instruction: '读短文，然后选答案。',
    passage: 'Tom has a dog. The dog is small and brown. Tom likes to play with it after school.',
    question: 'What is Tom’s dog like?',
    options: ['Big and black', 'Small and white', 'Small and brown'],
    answer: 'Small and brown',
    rubric: [{ dimension: '信息定位', weight: 1 }],
  },
  {
    id: 'en-read-b2',
    skill: 'reading',
    band: 'intermediate',
    instruction: '读短文，然后选最合适的答案。',
    passage:
      'Many plants need sunlight to grow. But some plants grow well in the shade. A gardener must find out which plant needs what before planting them in a garden.',
    question: 'What should a gardener find out before planting?',
    options: [
      'How to build a shade',
      'Which plant needs what',
      'When to water all plants',
      'Why all plants need sunlight',
    ],
    answer: 'Which plant needs what',
    rubric: [{ dimension: '信息定位', weight: 1 }],
  },
  {
    id: 'en-read-b3',
    skill: 'reading',
    band: 'ielts-prep',
    instruction: '读短文，然后选最符合文意的答案。',
    passage:
      'Some schools have replaced traditional homework with short daily reading. Teachers report that students now read more often, but not always more deeply. The change seems to help weaker readers build a habit, while stronger readers may need extra challenges to stay interested.',
    question: 'What does the passage suggest about the reading change?',
    options: [
      'It is clearly better for every student',
      'It has made all students read more deeply',
      'It helps some readers but may not be enough for others',
      'It should be stopped because it failed',
    ],
    answer: 'It helps some readers but may not be enough for others',
    rubric: [{ dimension: '推断', weight: 1 }],
  },
  {
    id: 'en-read-b4',
    skill: 'reading',
    band: 'advanced',
    instruction: '读短文，然后选最能概括作者立场的一项。',
    passage:
      'Advocates of longer school days argue that more time means more learning. Yet time alone is a poor measure. A well-designed forty-minute lesson can produce more durable understanding than two hours of unfocused activity. The real question is not how long students sit in class, but whether the time is structured around thinking.',
    question: 'What is the author’s main point?',
    options: [
      'Longer school days always improve results',
      'The quality of learning time matters more than the amount',
      'Forty-minute lessons are better than two-hour ones',
      'Students should not sit in class for long',
    ],
    answer: 'The quality of learning time matters more than the amount',
    rubric: [{ dimension: '立场概括', weight: 1 }],
  },

  // ================= writing 读写·写 =================
  {
    id: 'en-write-b1',
    skill: 'writing',
    band: 'beginner',
    instruction: '写 2 句话介绍你的朋友，用上 He is 或 She is。',
    question: 'Write two sentences about your friend.',
    minWords: 8,
    targets: ['is'],
    rubric: [
      { dimension: '长度达标', weight: 0.4 },
      { dimension: '句法完整', weight: 0.6 },
    ],
  },
  {
    id: 'en-write-b2',
    skill: 'writing',
    band: 'intermediate',
    instruction: '用过去时写 3–4 句话，说说你上周末做了什么。',
    question: 'Write three or four sentences about what you did last weekend.',
    minWords: 25,
    targets: ['was', 'went'],
    rubric: [
      { dimension: '长度达标', weight: 0.35 },
      { dimension: '时态与句法', weight: 0.4 },
      { dimension: '衔接连贯', weight: 0.25 },
    ],
  },
  {
    id: 'en-write-b3',
    skill: 'writing',
    band: 'ielts-prep',
    instruction: '写 80 词以上：小学生该不该开始学第二语言？给出你的观点和至少一个理由。',
    question:
      'Some people think children should start learning a second language at primary school. Do you agree? Give your opinion and at least one reason. (80+ words)',
    minWords: 80,
    targets: ['because', 'think', 'language'],
    rubric: [
      { dimension: '长度达标', weight: 0.25 },
      { dimension: '观点与论证', weight: 0.4 },
      { dimension: '语言准确与衔接', weight: 0.35 },
    ],
  },
  {
    id: 'en-write-b4',
    skill: 'writing',
    band: 'advanced',
    instruction: '写 150 词以上：孩子该不该拥有智能手机？讨论双方观点并给出结论。',
    question:
      'Some people believe children should be allowed to use smartphones; others think it is harmful. Discuss both views and give your own opinion. (150+ words)',
    minWords: 150,
    targets: ['however', 'because', 'conclusion'],
    rubric: [
      { dimension: '长度达标', weight: 0.2 },
      { dimension: '双观点讨论', weight: 0.4 },
      { dimension: '语言准确与衔接', weight: 0.4 },
    ],
  },

  // ============ 雅思预备：四单项"能否开始真题"判定 ============
  {
    id: 'en-ielts-listen',
    skill: 'listening',
    band: 'ielts-prep',
    instruction: '雅思听力风格：听一段校园通知，选答案。',
    audioText:
      'The library will be closed this Friday for equipment checks. Students who need a quiet place to study can use the reading room on the second floor of the science building from nine until five.',
    question: 'Where can students study while the library is closed?',
    options: [
      'The library on the first floor',
      'The science lab',
      'The reading room on the second floor of the science building',
      'Their classrooms',
    ],
    answer: 'The reading room on the second floor of the science building',
    ieltsSkill: 'listening',
    rubric: [{ dimension: '细节信息', weight: 1 }],
  },
  {
    id: 'en-ielts-read',
    skill: 'reading',
    band: 'ielts-prep',
    instruction: '雅思阅读风格：读段落，选答案。',
    passage:
      'Urban beekeeping has grown quickly in the past ten years. Supporters point to healthier bee populations and better pollination in city gardens. Critics warn that too many hives in one area can weaken wild bee species by competing for the same flowers.',
    question: 'What concern do critics raise?',
    options: [
      'City gardens do not need pollination',
      'Too many hives may compete with wild bees for flowers',
      'Bees cannot survive in cities',
      'Beekeeping should be banned everywhere',
    ],
    answer: 'Too many hives may compete with wild bees for flowers',
    ieltsSkill: 'reading',
    rubric: [{ dimension: '观点识别', weight: 1 }],
  },
  {
    id: 'en-ielts-write',
    skill: 'writing',
    band: 'ielts-prep',
    instruction: '雅思写作风格：100 词以上，表明立场并给出理由。',
    question:
      'Some people believe homework is unnecessary for young children. Others think it is essential. Discuss both views and give your opinion. (100+ words)',
    minWords: 100,
    targets: ['however', 'because', 'opinion'],
    ieltsSkill: 'writing',
    rubric: [
      { dimension: '长度达标', weight: 0.2 },
      { dimension: '双观点讨论', weight: 0.4 },
      { dimension: '语言准确与衔接', weight: 0.4 },
    ],
  },
  {
    id: 'en-ielts-speak',
    skill: 'speaking',
    band: 'ielts-prep',
    instruction: '雅思口语风格：描述一个帮助过你的人，连续说 60 秒左右。',
    question: 'Describe a person who has helped you. Say who the person is, how they helped you, and how you felt.',
    audioText: 'Describe a person who has helped you. You should say who the person is, how they helped you, and how you felt about it.',
    minWords: 60,
    targets: ['help', 'because', 'felt'],
    ieltsSkill: 'speaking',
    rubric: [
      { dimension: '信息覆盖', weight: 0.35 },
      { dimension: '句法与词汇', weight: 0.35 },
      { dimension: '衔接连贯', weight: 0.3 },
    ],
  },
];

export const IELTS_ITEMS = ENGLISH_ITEMS.filter((i) => i.ieltsSkill);

export function itemsFor(skill: EnglishSkill, band: EnglishBandId): EnglishItem[] {
  return ENGLISH_ITEMS.filter((i) => i.skill === skill && i.band === band);
}

// ---------------- 作答与评分 ----------------

export interface EnglishAnswer {
  itemId: string;
  /** 选择题选项 / 口语转写 / 写作正文 */
  value: string;
  /** 口语音频是否已本地留存（用于人工复核） */
  audioSaved?: boolean;
  /** 会话方式：asr=浏览器语音识别；typed=手动转写 */
  capture?: 'asr' | 'typed';
  durationMs?: number;
  savedAt: string;
}

export interface ItemScore {
  itemId: string;
  skill: EnglishSkill;
  band: EnglishBandId;
  score: number;
  passed: boolean;
  detail: string[];
  /** 发音维度单独标注，不参与分数 */
  pronunciationNote?: string;
}

/** 词数统计：按空白与常见标点切分 */
export function countWords(text: string): number {
  return String(text || '')
    .trim()
    .split(/[\s,.;:!?]+/)
    .filter(Boolean).length;
}

function sentences(text: string): string[] {
  return String(text || '')
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => countWords(s) >= 2);
}

const CONNECTIVES = ['because', 'but', 'and', 'so', 'however', 'although', 'while', 'then', 'first', 'finally'];

function connectiveHits(text: string): number {
  const lower = ` ${String(text || '').toLowerCase()} `;
  return CONNECTIVES.filter((c) => lower.includes(` ${c} `)).length;
}

export function gradeObjective(item: EnglishItem, value: string): ItemScore {
  const ok = String(value || '').trim().toLowerCase() === String(item.answer || '').trim().toLowerCase();
  return {
    itemId: item.id,
    skill: item.skill,
    band: item.band,
    score: ok ? 100 : 0,
    passed: ok,
    detail: ok ? ['答案正确'] : [`答案不正确；参考：${item.answer}`],
  };
}

/**
 * 写作评分：长度 + 句法完整度 + 关键信息/衔接。
 * 规则可判定、可解释，后续可再接 LLM 精评（本函数不依赖网络）。
 */
export function gradeWriting(item: EnglishItem, text: string): ItemScore {
  const words = countWords(text);
  const sents = sentences(text);
  const minWords = item.minWords || 0;
  const lengthRatio = minWords ? Math.min(1, words / minWords) : 1;
  const targetHits = (item.targets || []).filter((t) => text.toLowerCase().includes(t.toLowerCase())).length;
  const targetScore = item.targets?.length ? targetHits / item.targets.length : 1;
  const conn = Math.min(1, connectiveHits(text) / 2);
  const sentenceScore = Math.min(1, sents.length / 3);
  const startsUpper = /^[A-Z]/.test(text.trim()) ? 1 : 0;

  const detail: string[] = [];
  detail.push(`词数 ${words}${minWords ? ` / 建议 ≥${minWords}` : ''}`);
  detail.push(`有效句 ${sents.length}`);
  if (item.targets?.length) detail.push(`关键表达命中 ${targetHits}/${item.targets.length}`);
  if (words < minWords) detail.push('长度未达建议值，表达可能不充分');

  const raw =
    lengthRatio * 0.4 + targetScore * 0.25 + conn * 0.2 + sentenceScore * 0.1 + startsUpper * 0.05;
  const score = Math.round(Math.max(0, Math.min(1, raw)) * 100);
  // 开放题（写作）单题即代表一档，通过线设为 75，避免"长模板"越档
  return { itemId: item.id, skill: item.skill, band: item.band, score, passed: score >= 75, detail };
}

/**
 * 口语评分：基于转写文本。
 * 注意：拿不到声学信号，所以"发音"不给分，只给文本可判定维度。
 */
export function gradeSpeaking(item: EnglishItem, transcript: string, capture?: 'asr' | 'typed'): ItemScore {
  const words = countWords(transcript);
  const sents = sentences(transcript);
  const minWords = item.minWords || 0;
  const lengthRatio = minWords ? Math.min(1, words / minWords) : 1;
  const targetHits = (item.targets || []).filter((t) => transcript.toLowerCase().includes(t.toLowerCase())).length;
  const targetScore = item.targets?.length ? targetHits / item.targets.length : 1;
  const conn = Math.min(1, connectiveHits(transcript) / 2);
  const sentenceScore = Math.min(1, sents.length / 3);
  // 词形多样性（type/token）作为词汇丰富度弱代理
  const tokens = transcript.toLowerCase().match(/[a-z']+/g) || [];
  const diversity = tokens.length ? new Set(tokens).size / tokens.length : 0;
  const diversityScore = Math.min(1, diversity / 0.6);

  const detail: string[] = [];
  detail.push(`识别词数 ${words}${minWords ? ` / 建议 ≥${minWords}` : ''}`);
  detail.push(`有效句 ${sents.length}`);
  if (item.targets?.length) detail.push(`关键表达命中 ${targetHits}/${item.targets.length}`);
  detail.push(`词汇多样性 ${Math.round(diversityScore * 100)}%`);
  detail.push(capture === 'asr' ? '来源：浏览器语音识别转写' : '来源：手动输入转写');

  const raw = lengthRatio * 0.35 + targetScore * 0.25 + conn * 0.15 + sentenceScore * 0.1 + diversityScore * 0.15;
  const score = Math.round(Math.max(0, Math.min(1, raw)) * 100);
  return {
    itemId: item.id,
    skill: item.skill,
    band: item.band,
    score,
    // 开放题（口语）单题即代表一档，通过线设为 75
    passed: score >= 75,
    detail,
    pronunciationNote:
      '发音(pronunciation)未做声学评分：当前仅用浏览器转写文本判定信息、句法与衔接。发音需接入语音评测服务或由老师听音频复核。',
  };
}

export function gradeItem(item: EnglishItem, ans: EnglishAnswer): ItemScore {
  if (item.options?.length) return gradeObjective(item, ans.value);
  if (item.skill === 'writing') return gradeWriting(item, ans.value);
  return gradeSpeaking(item, ans.value, ans.capture);
}

// ---------------- 自适应选题 ----------------

export interface SkillProgress {
  skill: EnglishSkill;
  /** 已作答题目的档位序列 */
  bandTrail: EnglishBandId[];
  answered: Record<string, EnglishAnswer>;
  scores: ItemScore[];
}

export function newSkillProgress(skill: EnglishSkill): SkillProgress {
  return { skill, bandTrail: [], answered: {}, scores: [] };
}

/**
 * 下一个该考的档位：
 * - 未考过：按年级起点
 * - 最近一次通过：往上一档（到顶则停）
 * - 最近一次未通过：往下一档（到底则停）
 * 返回 null 表示该技能已结束。
 */
export function nextBandForSkill(
  progress: SkillProgress,
  startBand: EnglishBandId,
): EnglishBandId | null {
  const idx0 = bandIndex(startBand);
  if (progress.scores.length === 0) return ENGLISH_BANDS[idx0]?.id || 'beginner';
  const last = progress.scores[progress.scores.length - 1];
  if (progress.scores.length >= 3) return null;
  const lastIdx = bandIndex(last.band);
  const nextIdx = last.passed ? lastIdx + 1 : lastIdx - 1;
  if (nextIdx < 0 || nextIdx >= ENGLISH_BANDS.length) return null;
  const nextId = ENGLISH_BANDS[nextIdx].id;
  if (progress.bandTrail.includes(nextId)) return null;
  return nextId;
}

export function nextItemForSkill(progress: SkillProgress, startBand: EnglishBandId): EnglishItem | null {
  const band = nextBandForSkill(progress, startBand);
  if (!band) return null;
  return itemsFor(progress.skill, band)[0] || null;
}

/**
 * 是否需要追加"雅思四单项判定"。
 * 规则：
 * - 起点在雅思预备及以上（初一以上），且（有任一技能考到雅思预备档 或 四项平均≥50）
 * - 起点为初级/中级：只有真的考到雅思预备档才追加
 * 目的：既不漏测有潜力的学生，也不给还在打基础的孩子硬套雅思。
 */
export function shouldAdministerIelts(progress: Record<EnglishSkill, SkillProgress>, startBand: EnglishBandId): boolean {
  const all = (Object.keys(progress) as EnglishSkill[]).flatMap((s) => progress[s].scores);
  const passedHigh = all.some((x) => x.passed && bandIndex(x.band) >= bandIndex('ielts-prep'));
  if (bandIndex(startBand) < bandIndex('ielts-prep')) return passedHigh;
  const avg = all.length ? all.reduce((n, x) => n + x.score, 0) / all.length : 0;
  return passedHigh || avg >= 50;
}

/** 下一道尚未作答的雅思判定题；全部答完返回 null */
export function nextIeltsItem(progress: Record<EnglishSkill, SkillProgress>): EnglishItem | null {
  return IELTS_ITEMS.find((i) => !progress[i.skill].answered[i.id]) || null;
}

// ---------------- 汇总与分档 ----------------

export interface SkillResult {
  skill: EnglishSkill;
  label: string;
  bandReached: EnglishBandId;
  /** 0-100，取已考题目加权平均 */
  score: number;
  attempted: number;
  items: ItemScore[];
  note: string;
}

export const SKILL_LABELS: Record<EnglishSkill, string> = {
  listening: '听说·听',
  speaking: '口语·说',
  reading: '读写·读',
  writing: '读写·写',
};

export interface IeltsReadiness {
  administered: boolean;
  subscores: Record<'listening' | 'reading' | 'writing' | 'speaking', number | null>;
  ready: boolean;
  missing: string[];
  suggestion: string;
  bandEstimate: string;
}

export interface EnglishExamReport {
  examId: string;
  gradeYear: number;
  completedAt: string;
  skills: Record<EnglishSkill, SkillResult>;
  overallBand: EnglishBandId;
  overallCefr: string;
  clusters: { speaking: number; listeningSpeaking: number; readingWriting: number };
  ielts: IeltsReadiness;
  strengths: string[];
  gaps: string[];
  nextSteps: string[];
}

/**
 * 到达档位 = 连续通过的档位（不允许跳过失败档）。
 * 例如：初级题做错、却答对雅思预备题，不能判为雅思预备，而应回落到初级。
 * 这比"取通过过的最高档"更保守，避免单题运气造成越级宣称。
 */
function bandReachedFromScores(scores: ItemScore[]): EnglishBandId {
  const byBand = new Map<number, { attempted: number; passed: number }>();
  scores.forEach((s) => {
    const i = bandIndex(s.band);
    const cur = byBand.get(i) || { attempted: 0, passed: 0 };
    cur.attempted += 1;
    if (s.passed) cur.passed += 1;
    byBand.set(i, cur);
  });
  const failedIndices = [...byBand.entries()]
    .filter(([, v]) => v.attempted > 0 && v.passed === 0)
    .map(([i]) => i);
  const lowestFail = failedIndices.length ? Math.min(...failedIndices) : Infinity;
  const passedBelowFail = [...byBand.entries()]
    .filter(([i, v]) => v.passed > 0 && i < lowestFail)
    .map(([i]) => i);
  if (passedBelowFail.length) return ENGLISH_BANDS[Math.max(...passedBelowFail)].id;
  return 'beginner';
}

function avgScore(scores: ItemScore[]): number {
  if (!scores.length) return 0;
  return Math.round(scores.reduce((n, s) => n + s.score, 0) / scores.length);
}

export function gradeEnglishExam(opts: {
  examId: string;
  gradeYear: number;
  progress: Record<EnglishSkill, SkillProgress>;
  completedAt?: string;
}): EnglishExamReport {
  const startBand = startBandForGrade(opts.gradeYear);
  const skills = {} as Record<EnglishSkill, SkillResult>;
  (Object.keys(opts.progress) as EnglishSkill[]).forEach((skill) => {
    const p = opts.progress[skill];
    const bandReached = bandReachedFromScores(p.scores);
    const score = avgScore(p.scores);
    const evidenceAtBand = p.scores.filter((x) => x.band === bandReached && x.passed).length;
    const caveat = evidenceAtBand <= 1 ? '（该档仅 1 题证据，建议复测或加题确认）' : '';
    skills[skill] = {
      skill,
      label: SKILL_LABELS[skill],
      bandReached,
      score,
      attempted: p.scores.length,
      items: p.scores,
      note: `${bandById(bandReached).label}（${bandById(bandReached).cefr}）— ${bandById(bandReached).summary}${caveat}`,
    };
  });

  const order: EnglishSkill[] = ['listening', 'speaking', 'reading', 'writing'];
  const indices = order.map((s) => bandIndex(skills[s].bandReached));
  const overallIdx = Math.min(...indices);
  const overallBand = ENGLISH_BANDS[overallIdx].id;

  const clusters = {
    speaking: skills.speaking.score,
    listeningSpeaking: Math.round((skills.listening.score + skills.speaking.score) / 2),
    readingWriting: Math.round((skills.reading.score + skills.writing.score) / 2),
  };

  const ielts = gradeIeltsReadiness(opts.progress);
  // 一致性闸门：四项综合没到雅思预备档时，不能仅凭四道雅思题宣称"具备真题水平"
  if (ielts.administered && bandIndex(overallBand) < bandIndex('ielts-prep')) {
    ielts.ready = false;
    ielts.bandEstimate = '4.0 – 5.0（上限）';
    ielts.suggestion = `雅思四单项有单项达阈值，但四项综合定位仍是「${bandById(overallBand).label}（${bandById(overallBand).cefr}）」，未到雅思预备档，因此不判定为"具备开始真题练习水平"；先把最低项补到雅思预备档再复测。`;
  }

  const strengths = order.filter((s) => skills[s].bandReached !== 'beginner' || skills[s].score >= 70).map((s) => SKILL_LABELS[s]);
  const gaps = order.filter((s) => skills[s].score < 65).map((s) => SKILL_LABELS[s]);

  const nextSteps: string[] = [];
  if (skills.speaking.score < 65) nextSteps.push('口语：每天 3 分钟「先说后写」，用固定三句式（是什么—为什么—例子），先求说满再说准。');
  if (skills.listening.score < 65) nextSteps.push('听力：每天精听 1 段 30 秒音频，先听大意，再逐句听写关键词。');
  if (skills.reading.score < 65) nextSteps.push('阅读：每天 1 篇 150 词短文，先找主题句，再练一道推断题。');
  if (skills.writing.score < 65) nextSteps.push('写作：先练 5 句成段（观点+理由+例子+小结），再逐步加长。');
  if (ielts.administered && !ielts.ready) nextSteps.push(`雅思：暂不建议直接刷真题，先把 ${ielts.missing.join('、') || '基础项'} 补到阈值以上。`);
  if (!nextSteps.length) nextSteps.push('已具备当前档位的稳定表现，可进入下一档任务或雅思真题入门练习。');

  return {
    examId: opts.examId,
    gradeYear: opts.gradeYear,
    completedAt: opts.completedAt || new Date().toISOString(),
    skills,
    overallBand,
    overallCefr: bandById(overallBand).cefr,
    clusters,
    ielts,
    strengths,
    gaps,
    nextSteps,
  };
}

/**
 * 雅思"是否具备开始真题练习"判定。
 * 阈值是教研建议初值，可调；判据全部可解释。
 */
export function gradeIeltsReadiness(progress: Record<EnglishSkill, SkillProgress>): IeltsReadiness {
  const pick = (id: string) => {
    for (const skill of Object.keys(progress) as EnglishSkill[]) {
      const s = progress[skill].scores.find((x) => x.itemId === id);
      if (s) return s.score;
    }
    return null;
  };

  const subscores = {
    listening: pick('en-ielts-listen'),
    reading: pick('en-ielts-read'),
    writing: pick('en-ielts-write'),
    speaking: pick('en-ielts-speak'),
  };

  const administered = Object.values(subscores).some((v) => v !== null);
  if (!administered) {
    return {
      administered: false,
      subscores,
      ready: false,
      missing: [],
      suggestion: '雅思预备判定未启动：需先完成雅思风格的四单项任务。',
      bandEstimate: '未测',
    };
  }

  const thresholds: Record<keyof typeof subscores, number> = {
    listening: 65,
    reading: 65,
    writing: 60,
    speaking: 60,
  };
  const missing: string[] = [];
  (Object.keys(thresholds) as Array<keyof typeof subscores>).forEach((k) => {
    const v = subscores[k];
    if (v === null) missing.push(`${k}（未测）`);
    else if (v < thresholds[k]) missing.push(`${k}（${v} < ${thresholds[k]}）`);
  });

  const ready = missing.length === 0;
  const avg = (Object.values(subscores).filter((v) => v !== null) as number[]).reduce((a, b) => a + b, 0) /
    Math.max(1, Object.values(subscores).filter((v) => v !== null).length);
  const bandEstimate = avg >= 80 ? '5.5 – 6.0' : avg >= 65 ? '5.0 – 5.5' : avg >= 50 ? '4.0 – 5.0' : '4.0 以下';

  return {
    administered,
    subscores,
    ready,
    missing,
    suggestion: ready
      ? `四单项均达阈值，估计约 IELTS ${bandEstimate}，可以开始真题入门练习（先用剑桥雅思入门套题，限时但不追分）。`
      : `暂不建议直接刷真题：先补 ${missing.join('、')}，再复测一次。`,
    bandEstimate,
  };
}

/** 存档键：按学生 + 年级分开，便于复测对比 */
export function englishExamStorageKey(studentId: string): string {
  return `ops-english-exam-v1:${studentId}`;
}

export interface StoredEnglishExam {
  version: 1;
  examId: string;
  gradeYear: number;
  progress: Record<EnglishSkill, SkillProgress>;
  completedAt?: string;
  report?: EnglishExamReport;
}

export function loadEnglishExam(studentId: string): StoredEnglishExam | null {
  try {
    const raw = localStorage.getItem(englishExamStorageKey(studentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEnglishExam;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveEnglishExam(studentId: string, data: StoredEnglishExam): void {
  try {
    localStorage.setItem(englishExamStorageKey(studentId), JSON.stringify(data));
  } catch {
    /* 存储满时静默失败，由 UI 提示 */
  }
}
