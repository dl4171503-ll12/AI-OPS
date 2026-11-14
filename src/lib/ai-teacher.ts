import { SOCRATIC_POLICY } from './ops';
/**
 * AI 老师：入学水平自测与分档教学提纲
 */
export type AiSkillLevel = 'image' | 'web' | 'exam' | 'zero';

export const AI_SKILL_OPTIONS: Array<{
  id: AiSkillLevel;
  label: string;
  blurb: string;
}> = [
  { id: 'image', label: '会做图片', blurb: '已经会用 AI 画图、修图或出插画' },
  { id: 'web', label: '掌握 coding技术。', blurb: '会用 AI 辅助写代码、改代码（含 Vibe Coding 实战）' },
  { id: 'exam', label: '初步使用它生成卷子', blurb: '会让 AI 出题、出卷，刚起步' },
  { id: 'zero', label: '听说过这种（0 基础）', blurb: '知道有 AI，还几乎没用过' },
];

export function aiLevelLabel(level: AiSkillLevel | null | undefined): string {
  return AI_SKILL_OPTIONS.find((o) => o.id === level)?.label || '未测评';
}

/**
 * AI 老师按经验提供思考支架，遵守统一引导约束。
 */
export function aiTutorStyle(level: AiSkillLevel): string {
  return SOCRATIC_POLICY + '\n当前经验：' + aiLevelLabel(level) + '。可以提供类比、观察点和小范围示例，但不直接完成学生的任务。';
}
export function aiLevelSystemPrompt(level: AiSkillLevel): string {
  return '你是小智老师，帮助学生理解 AI、提示词和代码。' + aiTutorStyle(level);
}

export function aiLevelOpening(name: string, level: AiSkillLevel): string {
  const map: Record<AiSkillLevel, string> = {
    image: `${name}，你已经会做图。有想画的画面或提示词，直接丢过来，我们先观察哪里最值得改进。`,
    web: `${name}，既然你有 coding / Vibe Coding 基础，把报错、需求或代码贴过来，我们从一条线索开始推理。`,
    exam: `${name}，你会初步出卷。告诉我年级、科目和知识点，我们一起设计一条出题指令，并检查它是否清楚。`,
    zero: `${name}，从 0 开始没问题。想让 AI 帮你做什么，一句话说清楚就行——我马上带你做第一步。`,
  };
  return map[level];
}

export const AI_LEVEL_ASK =
  '你好！我是小智老师 🤖，专门教 AI 技术。先告诉我：你的 AI 水平是哪一种？选一个最接近的就好。';
