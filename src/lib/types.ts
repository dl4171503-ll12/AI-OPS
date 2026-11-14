import type { AdmissionState } from './admission';
import type { OpsState } from './ops';
export type AgeBand = 'low' | 'mid' | 'high';
export type GradeKey = 'primary-low' | 'primary-high' | 'middle' | 'high';
export type SubjectId = 'math' | 'chinese' | 'english' | 'science' | 'art' | 'pe' | 'ai';

/** 科学老师临时开实验室：先提问 → 开门禁 → 到期关闭 → 追问发现 */
export type LabMissionPhase = 'await_ack' | 'open' | 'reflect' | 'done';

export type LabMission = {
  id: string;
  phase: LabMissionPhase;
  question: string;
  focus: string;
  suggestLabId?: string;
  suggestLabTitle?: string;
  durationMs: number;
  openedAt?: string;
  until?: string;
  studentAck?: string;
  findings?: string;
  createdAt: string;
};

/** 日程表一行：家长填科目名，系统自动匹配学科 */
export type DayScheduleRow = {
  id: string;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  /** 家长填写的科目名称 */
  subjectLabel: string;
  /** 自动匹配到的学科；匹配失败则为 null */
  subjectId: SubjectId | null;
};

export type StudentProfile = {
  id: string;
  name: string;
  avatar: string;
  grade: GradeKey;
  /** 具体年级 1–12；语气：≤2 可亲切，≥3 正式 */
  gradeYear?: number;
  ageBand: AgeBand;
  schoolId: string;
  inviteCode: string;
  createdAt: string;
  studyDays: number;
  lastStudyDate: string;
  points: number;
  badges: string[];
  decorations: string[];
  promotedFrom?: AgeBand;
};

export type WrongItem = {
  cause?: string;
  practiceId?: string;
  id: string;
  subject: SubjectId;
  knowledge: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  createdAt: string;
};

export type PracticeRecord = {
  unitId?: string;
  reasoning?: string;
  durationMs?: number;
  revisions?: Array<{ answer: string; at: string }>;
  cause?: string;
  masteryAfter?: number;
  retryOf?: string;
  id: string;
  subject: SubjectId;
  question: string;
  userAnswer: string;
  correct: boolean;
  explanation: string;
  knowledge: string;
  createdAt: string;
};

export type AssessmentResult = {
  subject: SubjectId;
  done: boolean;
  strengths: string[];
  weaknesses: string[];
  mastery: Record<string, number>;
  score: number;
  completedAt?: string;
};

export type DailyPlan = {
  subject: SubjectId;
  date: string;
  tasks: Array<{ id: string; title: string; done: boolean; kind: string }>;
  generatedAt: string;
};

/** 入学校长面谈材料与下发给老师的报告 */
export type IntakeAnswers = {
  overview: string;
  strengths: string;
  weaknesses: string;
  stagnant: string;
  goals: string;
  /** 视力报告、试卷等资料说明 */
  materials: string;
  /** 是否因无资料改用摸底测 */
  usedQuiz: boolean;
  quizScore?: number;
  quizDetail?: string;
  /** 面谈中确认并写入账号的年级 */
  confirmedGradeYear?: number;
};

export type PrincipalIntakeReport = {
  generatedAt: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  stagnant: string[];
  progress: string[];
  teacherMemo: string;
  studentVoice: string;
  answers: IntakeAnswers;
  materialsSummary?: string;
  quizSummary?: string;
};

/** OPS 多维测评（I/E + 八维 + 倾向）落盘结构 */
export type IqePersonality =
  | 'I-A'
  | 'I-B'
  | 'I-C'
  | 'E-A'
  | 'E-B'
  | 'E-C';

export type IqeIqKey =
  | 'LOGIC'
  | 'LANG'
  | 'SPACE'
  | 'MUSIC'
  | 'KINESTHETIC'
  | 'INTERPERSONAL'
  | 'INTRAPERSONAL'
  | 'NATURAL';

export type IqeTendencyKey =
  | 'ALTRUISM'
  | 'FAIRNESS'
  | 'HONESTY'
  | 'EMPATHY'
  | 'RESPONSIBILITY'
  | 'AGGRESSION';

export type IqeResult = {
  version: 'v1';
  completedAt: string;
  personality: IqePersonality;
  personalityScores: Record<IqePersonality, number>;
  iq: Record<IqeIqKey, number>;
  iqPercentile: Record<IqeIqKey, number>;
  tendency: Record<IqeTendencyKey, 'low' | 'mid' | 'high'>;
};

/** 主科教材版本：对齐 textbook_map 版本代码 */
export type TextbookEditionPrefs = {
  chinese: string; // TongBian
  math: string; // RJ / BSD / ...
  english: string; // PEP / WY / ...
};

export const DEFAULT_EDITION_PREFS: TextbookEditionPrefs = {
  chinese: 'TongBian',
  math: 'RJ',
  english: 'PEP',
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  at: string;
};

export type EmotionLog = {
  id: string;
  mood: string;
  summary: string;
  at: string;
  risk?: 'none' | 'low' | 'mid' | 'high';
};

export type InterestProfile = {
  sports: number;
  art: number;
  music: number;
  coding: number;
  /** 名著赏析 */
  literature: number;
};

export type Friend = {
  id: string;
  name: string;
  schoolId: string;
  avatar: string;
};

export type SocialMessage = {
  id: string;
  from: string;
  to: string;
  content: string;
  at: string;
  blocked?: boolean;
  risk?: 'none' | 'low' | 'mid' | 'high';
  note?: string;
};

/** 老师对孩子说话的语气（家长可调） */
export type TeacherTone = 'formal' | 'balanced' | 'cute';

/** 护眼休息：家长可自定义后 5 分钟内容 */
export type EyeCareCustom = {
  /** 自定义背景音乐（data URL 或 http） */
  musicUrl?: string;
  /** 自定义小视频 */
  videoUrl?: string;
  /** 自定义插画 / 图片 */
  imageUrl?: string;
  /** 后 5 分钟提示文案 */
  tipText?: string;
  /** 今日背景音乐主题（文字，可选） */
  musicTheme?: string;
  /** 家长设定「今天放映」内容的日期 YYYY-MM-DD */
  todayDate?: string;
};

export type ParentSettings = {
  cultureEnabled?: boolean;
  socialView: 'full' | 'summary';
  allowSocial: boolean;
  encourageMsg?: string;
  /** 老师语气：正式 / 自然 / 可爱 */
  teacherTone?: TeacherTone;
  /** 护眼休息自定义（后 5 分钟） */
  eyeCare?: EyeCareCustom;
  /** 连续使用多久触发护眼（分钟），默认 40 */
  eyeCareMinutes?: number;
};

export const TEACHER_TONE_OPTIONS: Array<{
  id: TeacherTone;
  label: string;
  desc: string;
}> = [
  {
    id: 'formal',
    label: '正式稳重',
    desc: '文字更规范；Edge TTS 语速略慢、音调更稳',
  },
  {
    id: 'balanced',
    label: '自然亲切',
    desc: '默认：Edge TTS 自然语速，温和清楚',
  },
  {
    id: 'cute',
    label: '可可爱爱',
    desc: '文字更活泼；Edge TTS 语速略快、音调稍高',
  },
];

export function teacherToneLabel(tone: TeacherTone | undefined): string {
  return TEACHER_TONE_OPTIONS.find((o) => o.id === (tone || 'balanced'))?.label || '自然亲切';
}

export function teacherToneHint(tone: TeacherTone | undefined): string {
  const t = tone || 'balanced';
  if (t === 'formal') {
    return '语气正式、稳重、克制：少用「呀/哦/啦/嘛/嘻嘻」等可爱语气词，少用叠词与过度撒娇；以清晰讲解、礼貌鼓励为主，可称「同学」。';
  }
  if (t === 'cute') {
    return '语气可可爱爱、温暖活泼：可用适度语气词与比喻鼓励小龄学生，多肯定、少批评；用词简单有趣，可适当 emoji，但内容仍要讲清楚知识点。';
  }
  return '语气自然亲切：友好清楚、鼓励思考，不过分正式也不过分卖萌。';
}

/** 每日主科 / 副科学习时长占比（家长可调） */
export type StudyTimePlan = {
  dailyMinutes: number;
  majorPercent: number;
  majorSplit: { math: number; chinese: number; english: number };
  minorSplit: { science: number; art: number; pe: number };
};

export type SchoolState = {
  schoolSetupCompletedAt?: string;
  ops: OpsState;
  admission: AdmissionState | null;
  student: StudentProfile | null;
  assessments: Partial<Record<SubjectId, AssessmentResult>>;
  plans: Partial<Record<SubjectId, DailyPlan>>;
  /** 家长设定的每日学习时长占比 */
  studyTimePlan: StudyTimePlan;
  /** AI 老师测评的技能水平；null=尚未回答 */
  aiSkillLevel: 'image' | 'web' | 'exam' | 'zero' | null;
  wrongBook: WrongItem[];
  practices: PracticeRecord[];
  principalChat: ChatMessage[];
  counselorChat: ChatMessage[];
  emotions: EmotionLog[];
  interests: InterestProfile;
  friends: Friend[];
  socialInbox: SocialMessage[];
  exploreNotes: string[];
  morningBrief?: { date: string; content: string; daypart?: string };
  parent: ParentSettings;
  /** 家长日程表（按时段匹配科目并提醒） */
  daySchedule: DayScheduleRow[];
  funUnlockedToday: boolean;
  /** 科学课后自由实验室截止时间（ISO）；过期即关闭 */
  freeLabUntil: string | null;
  /** 已完成的实验 id */
  labCompletedIds: string[];
  /** 阿科老师「先提问再开门禁」的临时实验室任务 */
  labMission: LabMission | null;
  /** 入学校长面谈是否完成；false=须先去校长室 */
  principalIntakeDone: boolean;
  /** 入学面谈报告（下发给各科老师） */
  principalIntake: PrincipalIntakeReport | null;
  /** 多维 IQE 测评结果；null=尚未完成 */
  iqeResult: IqeResult | null;
  /** 主科教材版本偏好（OPS 教材地图） */
  editionPrefs: TextbookEditionPrefs;
  promotionReady: boolean;
  showPromotion: boolean;
};

export const GRADE_OPTIONS: Array<{ key: GradeKey; label: string; band: AgeBand; desc: string }> = [
  { key: 'primary-low', label: '小学低段 (1-4年级)', band: 'low', desc: '大图标、多配图、游戏感' },
  { key: 'primary-high', label: '小学高段 (5-6年级)', band: 'mid', desc: '半卡通半写实、自主规划' },
  { key: 'middle', label: '初中', band: 'mid', desc: '知识性增强、平等对话' },
  { key: 'high', label: '高中', band: 'high', desc: '简洁高效、目标与自律' },
];

/** 根据年级获取对学生的称呼：一二年级叫"小朋友"，三年级及以上叫"同学" */
export function getStudentTitle(grade: GradeKey | undefined, gradeYear?: number): string {
  const y =
    gradeYear != null
      ? gradeYear
      : grade === 'primary-low'
        ? 2
        : grade === 'primary-high'
          ? 5
          : grade === 'middle'
            ? 7
            : grade === 'high'
              ? 10
              : 2;
  if (y <= 2) return '小朋友';
  return '同学';
}

export const AVATARS = ['🧒', '👧', '👦', '🧑', '🐱', '🦊', '🐼', '🐸']; // 兼容旧数据；新流程请用 AVATAR_TEMPLATES

export const SUBJECTS: Array<{
  id: SubjectId;
  name: string;
  building: string;
  emoji: string;
  color: string;
  blurb: string;
  enabled: boolean;
}> = [
  { id: 'math', name: '数学楼', building: 'Math Hall', emoji: '🔢', color: '#4d96ff', blurb: '数字冒险与逻辑闯关', enabled: true },
  { id: 'chinese', name: '语文楼', building: 'Chinese Hall', emoji: '📖', color: '#ff6b6b', blurb: '语文老师：语文 · 历史 · 地理', enabled: true },
  { id: 'english', name: '英语楼', building: 'English Hall', emoji: '🌍', color: '#51cf66', blurb: '听说读写的语言星球', enabled: true },
  { id: 'science', name: '科学楼', building: 'Science Lab', emoji: '🔬', color: '#845ef7', blurb: '阿科老师：科学·物理·化学·生物 + 实验室', enabled: true },
  { id: 'art', name: '艺术楼', building: 'Art Studio', emoji: '🎨', color: '#f783ac', blurb: '色彩与创意表达', enabled: true },
  { id: 'ai', name: 'AI 中心', building: 'AI Center', emoji: '🤖', color: '#22d3ee', blurb: '小智老师：按水平教 AI 技术', enabled: true },
  { id: 'pe', name: '体育中心', building: 'PE Center', emoji: '🏃', color: '#fcc419', blurb: '运动与健康习惯', enabled: true },
];

export function gradeToBand(grade: GradeKey): AgeBand {
  return GRADE_OPTIONS.find((g) => g.key === grade)?.band || 'low';
}

export function bandLabel(band: AgeBand): string {
  if (band === 'low') return '低龄段';
  if (band === 'mid') return '高龄段';
  return '高中段';
}

export function agePromptHint(band: AgeBand): string {
  if (band === 'low') {
    return '用小学低年级孩子能听懂的话：短句、比喻、鼓励、少术语，可适当 emoji。';
  }
  if (band === 'mid') {
    return '用语适合小学高年级到初中：清晰有条理，可有适度术语并解释，鼓励自主思考。';
  }
  return '用语简洁高效，适合高中生：深度、目标导向、平等对话，少幼稚口吻。';
}
