import type { IqeResult } from '@/lib/types';

const PERSONALITY_HINT: Record<string, string> = {
  'I-A': '偏内向·深思型：先给思考时间，少打断',
  'I-B': '偏内向·观察型：先讲规则与范例',
  'I-C': '偏内向·充电型：讲解分块，留安静练习',
  'E-A': '偏外向·社交型：多用对话与分享',
  'E-B': '偏外向·带动型：可设小目标当「队长」',
  'E-C': '偏外向·边说边想：鼓励口头梳理',
};

/** 注入各科老师 / 校长的学情画像短句 */
export function iqeTeacherContext(iqe: IqeResult | null | undefined): string {
  if (!iqe) return '';
  const topIq = Object.entries(iqe.iq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k}${v}`)
    .join('、');
  const tip = PERSONALITY_HINT[iqe.personality] || iqe.personality;
  return `学生多维测评：人格 ${iqe.personality}（${tip}）；优势能力靠前：${topIq}。教学节奏与互动方式请对齐人格提示，勿做好坏评判。`;
}
