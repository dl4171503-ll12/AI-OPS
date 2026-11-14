/**
 * 入学校长摸底测：按年级出适龄小题（无纸质资料时使用）
 */
import { clampYear, type GradeYear } from './grade-speak';
import { normalizeAnswer } from './knowledge';

export type IntakeQuizItem = {
  id: string;
  subject: 'math' | 'chinese' | 'english' | 'science';
  q: string;
  a: string;
  options?: string[];
};

type BandKey = 'g1_2' | 'g3_4' | 'g5_6' | 'g7_9' | 'g10_12';

function bandOf(year: GradeYear): BandKey {
  const y = clampYear(year);
  if (y <= 2) return 'g1_2';
  if (y <= 4) return 'g3_4';
  if (y <= 6) return 'g5_6';
  if (y <= 9) return 'g7_9';
  return 'g10_12';
}

const BANK: Record<BandKey, IntakeQuizItem[]> = {
  g1_2: [
    { id: 'm1', subject: 'math', q: '7 + 5 = ?', a: '12', options: ['11', '12', '13'] },
    { id: 'c1', subject: 'chinese', q: '「大」的反义词是？', a: '小', options: ['多', '小', '高'] },
    { id: 'e1', subject: 'english', q: 'Apple 的中文是？', a: '苹果', options: ['香蕉', '苹果', '梨'] },
    { id: 's1', subject: 'science', q: '太阳从哪边升起？', a: '东边', options: ['西边', '东边', '南边'] },
  ],
  g3_4: [
    { id: 'm1', subject: 'math', q: '36 ÷ 6 = ?', a: '6', options: ['5', '6', '7'] },
    { id: 'c1', subject: 'chinese', q: '「兴高采烈」形容的是？', a: '很高兴', options: ['很伤心', '很高兴', '很害怕'] },
    { id: 'e1', subject: 'english', q: 'I ___ a student.（填 am/is/are）', a: 'am', options: ['am', 'is', 'are'] },
    { id: 's1', subject: 'science', q: '植物生长通常需要？', a: '阳光和水', options: ['只有石头', '阳光和水', '只有黑暗'] },
  ],
  g5_6: [
    { id: 'm1', subject: 'math', q: '3/4 + 1/4 = ?', a: '1', options: ['1/2', '1', '2'] },
    { id: 'c1', subject: 'chinese', q: '说明文主要作用是？', a: '介绍说明事物', options: ['讲故事', '介绍说明事物', '抒发感情'] },
    { id: 'e1', subject: 'english', q: '过去式：go → ?', a: 'went', options: ['goed', 'went', 'gone'] },
    { id: 's1', subject: 'science', q: '水沸腾时温度大约是？', a: '100℃', options: ['0℃', '50℃', '100℃'] },
  ],
  g7_9: [
    { id: 'm1', subject: 'math', q: '一元一次方程：2x + 4 = 10，x = ?', a: '3', options: ['2', '3', '4'] },
    { id: 'c1', subject: 'chinese', q: '记叙文六要素不包括？', a: '化学式', options: ['时间', '人物', '化学式'] },
    { id: 'e1', subject: 'english', q: 'She ___ to school yesterday.（go）', a: 'went', options: ['go', 'goes', 'went'] },
    { id: 's1', subject: 'science', q: '串联电路中开关断开，灯泡会？', a: '熄灭', options: ['更亮', '熄灭', '不变'] },
  ],
  g10_12: [
    { id: 'm1', subject: 'math', q: '函数 f(x)=2x+1，f(3)=?', a: '7', options: ['5', '6', '7'] },
    { id: 'c1', subject: 'chinese', q: '议论文三要素通常包括论点、论据和？', a: '论证', options: ['描写', '论证', '抒情'] },
    { id: 'e1', subject: 'english', q: 'If it rains, we ___ stay home.（will）', a: 'will', options: ['will', 'would', 'are'] },
    { id: 's1', subject: 'science', q: '牛顿第一定律主要描述？', a: '惯性', options: ['惯性', '浮力', '光合作用'] },
  ],
};

export function intakeQuizForYear(year: number): IntakeQuizItem[] {
  return BANK[bandOf(clampYear(year))].map((q) => ({ ...q }));
}

export function gradeQuiz(
  items: IntakeQuizItem[],
  answers: Record<string, string>,
): { score: number; correct: number; total: number; detail: string } {
  let correct = 0;
  const lines: string[] = [];
  for (const item of items) {
    const raw = answers[item.id] || '';
    const ok = normalizeAnswer(raw) === normalizeAnswer(item.a);
    if (ok) correct += 1;
    lines.push(`${item.subject}:${ok ? '对' : '错'}`);
  }
  const total = items.length || 1;
  const score = Math.round((correct / total) * 100);
  return {
    score,
    correct,
    total,
    detail: `摸底测 ${correct}/${total}（约 ${score} 分）；${lines.join('，')}`,
  };
}

/** 资料类型快捷选项 */
export const MATERIAL_CHIPS = [
  '视力/眼科报告',
  '近期语文卷子',
  '近期数学卷子',
  '近期英语卷子',
  '科学/实验报告',
  '体检或听力报告',
  '老师评语/成绩单',
] as const;
