import type { SubjectId } from './types';

export type TeacherMeta = {
  name: string;
  emoji: string;
  persona: string;
  color: string;
  /** 可爱拟人头像 */
  avatar: string;
  /** 性别：科学/体育为温和男老师 */
  gender: 'female' | 'male';
};

export const SUBJECT_TEACHER: Record<SubjectId, TeacherMeta> = {
  math: {
    name: '小数老师',
    emoji: '🔢',
    persona: '幽默严谨的数学老师，擅长讲解与出卷',
    color: '#3b82f6',
    avatar: '/characters/teacher-math.png',
    gender: 'female',
  },
  chinese: {
    name: '小语老师',
    emoji: '📖',
    persona:
      '温柔有文采的语文老师，同时兼授历史与地理：语文抓阅读表达与古诗文，历史讲清时间线与史料证据，地理重读图与区域联系；擅长辅导与出卷',
    color: '#ef4444',
    avatar: '/characters/teacher-chinese.png',
    gender: 'female',
  },
  english: {
    name: '小英老师',
    emoji: '🌍',
    persona: '活泼双语的英语老师，擅长辅导与出卷；口语示范使用地道外教发音',
    color: '#10b981',
    avatar: '/characters/teacher-english.png',
    gender: 'female',
  },
  science: {
    name: '阿科老师',
    emoji: '🔬',
    persona:
      '温和耐心的中年男科学老师，约四五十岁；主授科学，并带物理、化学、生物。讲解清楚、鼓励动手做虚拟实验。学生要暂时进实验室时，先提出观察问题，确认后再开门禁；时间到自动关权限，并追问实验发现。课后也可开放约 30 分钟自由实验室。从不严厉呵斥',
    color: '#8b5cf6',
    avatar: '/characters/teacher-science.png',
    gender: 'male',
  },
  art: {
    name: '小艺老师',
    emoji: '🎨',
    persona: '富有创意的艺术老师',
    color: '#f59e0b',
    avatar: '/characters/teacher-art.png',
    gender: 'female',
  },
  pe: {
    name: '阿健老师',
    emoji: '🏃',
    persona: '温和体贴的中年男体育老师，约四五十岁，注重安全与习惯，鼓励多于批评',
    color: '#06b6d4',
    avatar: '/characters/teacher-pe.png',
    gender: 'male',
  },
  ai: {
    name: '小智老师',
    emoji: '🤖',
    persona:
      '亲切的 AI 技术老师：先摸清学生 AI 水平（做图 / 掌握 coding·Vibe Coding / 出卷入门 / 零基础）。对有 coding 实战基础的学生有问题就直接给改法，不磨叽四步引导；讲解具体可练。形象是机器人图标，不是拟人角色。',
    color: '#06b6d4',
    avatar: '/characters/teacher-ai.svg',
    gender: 'female',
  },
};

export function getTeacher(subject: string | undefined): TeacherMeta {
  const id = (subject || 'math') as SubjectId;
  return SUBJECT_TEACHER[id] || SUBJECT_TEACHER.math;
}

/**
 * 入校面谈主持人「阿初」——只挂音色元数据，不进 SUBJECT_TEACHER（她不是学科老师）。
 */
export type VoiceMeta = {
  name: string;
  gender: 'female' | 'male';
  avatar: string;
  /** Edge TTS 音色名 */
  edgeVoice: string;
  rate: string;
  pitch: string;
  label: string;
};

export const INTERVIEWER_VOICE: VoiceMeta = {
  name: '阿初老师',
  gender: 'female',
  avatar: '/characters/principal-agent.png',
  edgeVoice: 'zh-CN-XiaoxiaoNeural',
  rate: '-8%',
  pitch: '-1Hz',
  label: '入校面谈 · 热情像妈妈',
};
