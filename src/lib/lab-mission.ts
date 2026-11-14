/**
 * 科学老师「临时开实验室」任务流：
 * 先提问 → 开门禁 → 到期关闭 → 追问发现
 */
import { LAB_EXPERIMENTS, type LabExperiment } from './science-labs';
import type { AgeBand, LabMission } from './types';

export type { LabMission, LabMissionPhase } from './types';

/** 学生口头申请临时实验室时的默认时长 */
export const TEMP_LAB_MISSION_MS = 15 * 60 * 1000;

const ACCESS_REQUEST =
  /打开.*(实验|实验室)|开.*(实验室|权限)|实验室.*(权限|开|门)|暂时.*(实验|实验室)|能.*去.*实验|去实验室|开放.*实验|自由实验|想做实验|做个实验|进实验室|进.*实验室/;

const DONE_EARLY =
  /做完了|观察完了|实验完了|回来了|我回来了|发现了|看到了|结束实验|关.*实验室|时间不够/;

export function isLabAccessRequest(text: string): boolean {
  return ACCESS_REQUEST.test(text.trim());
}

export function isLabMissionDoneEarly(text: string): boolean {
  return DONE_EARLY.test(text.trim());
}

type PromptSeed = {
  question: string;
  focus: string;
  labId?: string;
};

const SEEDS: PromptSeed[] = [
  {
    labId: 'lab-blank-sandbox',
    question: '如果你只能带三种器材去空白实验室，你会选哪三样？进实验室后亲自试一试，看看它们能组合出什么现象。',
    focus: '自由组合器材，记录一种有趣现象',
  },
  {
    labId: 'phy-series-circuit',
    question: '串联电路里，开关断开时灯泡会怎样？请去实验室亲手搭一搭，再告诉我你看到了什么。',
    focus: '观察开关开合时灯泡是否发光',
  },
  {
    labId: 'phy-parallel-circuit',
    question: '并联和串联有什么不一样？去实验室对比一下，记下你的发现。',
    focus: '对比串并联灯泡表现',
  },
  {
    labId: 'chem-acid-base',
    question: '酸碱指示剂遇到酸和碱颜色会怎样变？请去试剂台试一试并仔细观察。',
    focus: '观察指示剂颜色变化',
  },
  {
    labId: 'sci-magnet',
    question: '磁铁能吸住哪些东西？不能吸住哪些？去实验室用磁铁亲自试，把结果记下来。',
    focus: '区分能被磁铁吸引的材料',
  },
  {
    labId: 'sci-sink-float',
    question: '同样的橡皮泥，捏成实心球和捏成小船，在水里沉浮有何不同？请去实验室观察。',
    focus: '形状如何影响浮沉',
  },
  {
    labId: 'phy-reflection',
    question: '入射角变大时，反射角会怎么变？去光学台调角度，亲眼确认。',
    focus: '验证反射角与入射角的关系',
  },
  {
    labId: 'bio-microscope',
    question: '调焦前后你看到的细胞轮廓有什么差别？去显微台亲自调一调。',
    focus: '体验调焦对清晰度的影响',
  },
  {
    labId: 'phy-heat-expand',
    question: '加热后液体柱会升高还是降低？去热学台观察并说出原因猜想。',
    focus: '观察受热膨胀现象',
  },
  {
    labId: 'chem-co2',
    question: '制取二氧化碳时你会看到哪些现象？去化学实验里跟做并记录。',
    focus: '记录气体产生的现象',
  },
];

function pickSeed(band?: AgeBand, hint?: string): PromptSeed {
  const hintLow = (hint || '').toLowerCase();
  const byHint = SEEDS.find((s) => {
    if (!s.labId) return false;
    const lab = LAB_EXPERIMENTS.find((e) => e.id === s.labId);
    if (!lab) return false;
    return (
      hintLow.includes(lab.title) ||
      hintLow.includes(lab.topic) ||
      (/电路|灯泡/.test(hintLow) && lab.engine === 'circuit') ||
      (/酸碱|化学/.test(hintLow) && lab.track === 'chemistry') ||
      (/磁/.test(hintLow) && /磁/.test(lab.title)) ||
      (/显微|细胞/.test(hintLow) && lab.engine === 'microscope') ||
      (/空白|自由|器材/.test(hintLow) && lab.engine === 'sandbox')
    );
  });
  if (byHint) return byHint;

  const filtered = SEEDS.filter((s) => {
    if (!s.labId || !band) return true;
    const lab = LAB_EXPERIMENTS.find((e) => e.id === s.labId);
    return !lab || lab.bands.includes(band);
  });
  const pool = filtered.length ? filtered : SEEDS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function createLabMissionDraft(opts?: {
  band?: AgeBand;
  studentHint?: string;
  durationMs?: number;
}): LabMission {
  const seed = pickSeed(opts?.band, opts?.studentHint);
  const lab: LabExperiment | undefined = seed.labId
    ? LAB_EXPERIMENTS.find((e) => e.id === seed.labId)
    : undefined;
  return {
    id: `lm-${Date.now().toString(36)}`,
    phase: 'await_ack',
    question: seed.question,
    focus: seed.focus,
    suggestLabId: lab?.id,
    suggestLabTitle: lab?.title,
    durationMs: opts?.durationMs ?? TEMP_LAB_MISSION_MS,
    createdAt: new Date().toISOString(),
  };
}

export function formatMissionAskReply(mission: LabMission, studentName: string): string {
  const where = mission.suggestLabTitle
    ? `建议去「${mission.suggestLabTitle}」或空白实验室观察。`
    : '可以去空白实验室或任意相关实验台观察。';
  return (
    `${studentName}，想暂时进实验室可以——但阿科老师有个规矩：` +
    `先听清观察任务，再开门禁。\n\n` +
    `【观察问题】${mission.question}\n\n` +
    `${where}\n` +
    `听明白了吗？回我一句「明白了」或简单说说你打算怎么观察，我就给你开约 ${Math.round(mission.durationMs / 60000)} 分钟权限。`
  );
}

export function formatMissionOpenReply(mission: LabMission, studentName: string): string {
  const mins = Math.round(mission.durationMs / 60000);
  return (
    `好，${studentName}！权限已打开，大约 ${mins} 分钟。\n\n` +
    `请亲自去实验室，围绕这个问题观察：\n「${mission.question}」\n\n` +
    `焦点：${mission.focus}` +
    (mission.suggestLabTitle ? `（可先找「${mission.suggestLabTitle}」）` : '') +
    `\n\n时间一到权限会自动关闭。做完或时间到了，记得回来告诉我：你在实验中发现了什么？\n` +
    `👉 点上方「进入自由实验室」，或打开「实验室」标签。`
  );
}

export function formatMissionReflectPrompt(studentName: string, question: string): string {
  return (
    `${studentName}，实验室时间到啦（或你已回来）。\n\n` +
    `还记得老师让你观察的问题吗：\n「${question}」\n\n` +
    `现在请告诉我：你在实验中发现了什么？看到了哪些现象？有没有和预想不一样的地方？`
  );
}

export function formatMissionFindingsFeedback(
  studentName: string,
  findings: string,
  question: string,
): string {
  const short = findings.trim().slice(0, 80) || '你的观察';
  return (
    `谢谢分享，${studentName}！你说「${short}${findings.trim().length > 80 ? '…' : ''}」，很棒。\n` +
    `这正对应老师的问题：「${question}」——动手看过，印象会更深。\n` +
    `以后想再进实验室，随时跟我说；我还会先给你一个新的观察问题哦。`
  );
}
