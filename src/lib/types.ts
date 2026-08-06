export type AgeBand = 'low' | 'mid' | 'high';
export type GradeKey = 'primary-low' | 'primary-high' | 'middle' | 'high';
export type SubjectId = 'math' | 'chinese' | 'english' | 'science' | 'art' | 'pe';

export type StudentProfile = {
  id: string;
  name: string;
  avatar: string;
  grade: GradeKey;
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

export type ParentSettings = {
  pin: string;
  socialView: 'full' | 'summary';
  allowSocial: boolean;
  encourageMsg?: string;
};

export type SchoolState = {
  student: StudentProfile | null;
  assessments: Partial<Record<SubjectId, AssessmentResult>>;
  plans: Partial<Record<SubjectId, DailyPlan>>;
  wrongBook: WrongItem[];
  practices: PracticeRecord[];
  principalChat: ChatMessage[];
  counselorChat: ChatMessage[];
  emotions: EmotionLog[];
  interests: InterestProfile;
  friends: Friend[];
  socialInbox: SocialMessage[];
  exploreNotes: string[];
  morningBrief?: { date: string; content: string };
  parent: ParentSettings;
  funUnlockedToday: boolean;
  promotionReady: boolean;
  showPromotion: boolean;
};

export const GRADE_OPTIONS: Array<{ key: GradeKey; label: string; band: AgeBand; desc: string }> = [
  { key: 'primary-low', label: '小学低段 (1-4年级)', band: 'low', desc: '大图标、多配图、游戏感' },
  { key: 'primary-high', label: '小学高段 (5-6年级)', band: 'mid', desc: '半卡通半写实、自主规划' },
  { key: 'middle', label: '初中', band: 'mid', desc: '知识性增强、平等对话' },
  { key: 'high', label: '高中', band: 'high', desc: '简洁高效、目标与自律' },
];

export const AVATARS = ['🧒', '👧', '👦', '🧑', '🐱', '🦊', '🐼', '🐸'];

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
  { id: 'chinese', name: '语文楼', building: 'Chinese Hall', emoji: '📖', color: '#ff6b6b', blurb: '文字世界与阅读表达', enabled: true },
  { id: 'english', name: '英语楼', building: 'English Hall', emoji: '🌍', color: '#51cf66', blurb: '听说读写的语言星球', enabled: true },
  { id: 'science', name: '科学楼', building: 'Science Lab', emoji: '🔬', color: '#845ef7', blurb: '探索自然与实验（1.0 预览）', enabled: false },
  { id: 'art', name: '艺术楼', building: 'Art Studio', emoji: '🎨', color: '#f783ac', blurb: '色彩与创意（1.0 预览）', enabled: false },
  { id: 'pe', name: '体育中心', building: 'PE Center', emoji: '🏃', color: '#fcc419', blurb: '运动与健康（1.0 预览）', enabled: false },
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
