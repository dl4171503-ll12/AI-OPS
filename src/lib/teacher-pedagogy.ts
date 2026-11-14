import { SOCRATIC_POLICY } from './ops';
/**
 * 全校老师对话教学法：
 * 1) 先给材料（文章节选 / 名画描述 / 题目情境）
 * 2) 引导学生思考（给足思考支架，禁止空喊「你自己想」）
 * 3) 追问「为什么会这样想」
 * 4) 学生归纳与验证
 */

/** 学生是否明确要求「直接给答案」 */
export function wantsDirectAnswer(userText: string): boolean {
  const t = String(userText || '');
  return /直接(告诉|给|说|答)|只要答案|标准答案|别问了|不要问我|快点告诉我|就说对不对|直接批改|不要启发/.test(t);
}

/** 四步引导阶段 */
export type GuideThinkPhase = 'material' | 'think' | 'why' | 'answer';

export const GUIDE_THINK_STEPS: Array<{ id: GuideThinkPhase; label: string }> = [
  { id: 'material', label: '① 看材料' },
  { id: 'think', label: '② 先思考' },
  { id: 'why', label: '③ 问为什么' },
  { id: 'answer', label: '④ 自己验证' },
];

/**
 * 强制四步模式（兴趣楼 / 名著 / 绘画 / 音乐 / 学科辅导共用）
 * - 必须先有材料
 * - 思考题要带支架（观察点、可选方向），不能纯甩锅给学生
 * - 未问清「为什么」前，不给完整标准答案
 */
export function guidedThinkPedagogy(opts?: {
  phase?: GuideThinkPhase | null;
  materialKind?: 'excerpt' | 'painting' | 'music' | 'problem' | 'general';
}): string {
  const phase = opts?.phase || null;
  const kind = opts?.materialKind || 'general';
  const materialName =
    kind === 'excerpt'
      ? '文章/故事节选'
      : kind === 'painting'
        ? '名画或画面描述'
        : kind === 'music'
          ? '音乐片段/情境描述'
          : kind === 'problem'
            ? '题目或情境材料'
            : '学习材料';

  const phaseHint =
    phase === 'material'
      ? `【当前步骤=①材料】只呈现并带读${materialName}，可点出 1 个观察焦点；不要给结论答案。`
      : phase === 'think'
        ? `【当前步骤=②思考】基于材料提出 1～2 个具体思考题，并给出思考支架（例如：可以先看谁/哪一块颜色/哪一句；可选方向 A/B）。禁止只说「你自己想想」而不给任何信息。仍不要给完整标准答案。`
        : phase === 'why'
          ? `【当前步骤=③为什么】针对学生刚才的想法追问：你为什么会这样想？依据材料里的哪一点？可帮他复述他的观点再追问。仍不要急着给完整标准答案，由学生自己归纳并验证。`
          : phase === 'answer'
            ? `【当前步骤=④答案】请学生自己归纳观点并验证，教师只回扣材料与推理；肯定学生思考中合理的部分，温和指出可改进处；结尾可留一个小延伸，但不要再堆新题。`
            : `【步骤自检】若对话刚开始：先给材料；若已给材料：引导思考；若学生已作答：追问为什么；若理由已清楚：请学生自己验证。`;

  return `【对话模式·四步引导·强制】
顺序必须是：①先给${materialName} → ②引导学生思考（含支架）→ ③询问为什么这样想 → ④学生自己归纳与验证。
硬性禁止：
- 一上来就给建议/标准答案/大段讲解；
- 只逼学生思考却不提供任何观察点、提示方向或材料信息；
- 跳过「为什么」直接宣布对错。
即使学生要求直接给答案，也只提供下一步提示，不替学生得出结论。
${phaseHint}`;
}

/** 辅导对话（老师 Agent） */
export function teacherTutorPedagogy(userText: string, phase?: GuideThinkPhase | null): string {
  return SOCRATIC_POLICY + '\n' + guidedThinkPedagogy({ phase: phase ?? null, materialKind: 'problem' });
}

export function teacherGradePedagogy(): string {
  return `${SOCRATIC_POLICY}
只做判分与推理反馈：点明条件、回应学生思路、提供下一步提示，不展示最终答案。
输出 JSON：{"correct":true或false,"explanation":"温和的提示与引导","correctAnswer":""}`;
}
export function inferTutorPhaseFromHistory(history: Array<{ role: string; content: string }>): GuideThinkPhase {
  const count = history.filter(m => m.role === 'user').length;
  return count === 0 ? 'material' : count === 1 ? 'think' : count === 2 ? 'why' : 'answer';
}
