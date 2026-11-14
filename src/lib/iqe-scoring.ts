/** IQE 计分（从 OPS T-10 同步；无 @ops/shared 依赖） */

export type PersonalitySubtype = 'I-A' | 'I-B' | 'I-C' | 'E-A' | 'E-B' | 'E-C';
export type IqDimension =
  | 'LOGIC'
  | 'LANG'
  | 'SPACE'
  | 'MUSIC'
  | 'KINESTHETIC'
  | 'INTERPERSONAL'
  | 'INTRAPERSONAL'
  | 'NATURAL';
export type TendencyDimension =
  | 'ALTRUISM'
  | 'FAIRNESS'
  | 'HONESTY'
  | 'EMPATHY'
  | 'RESPONSIBILITY'
  | 'AGGRESSION';
export type TendencyLevel = 'low' | 'mid' | 'high';

const PERSONALITY_SUBTYPES: PersonalitySubtype[] = [
  'I-A', 'I-B', 'I-C', 'E-A', 'E-B', 'E-C',
];
const IQ_DIMENSIONS: IqDimension[] = [
  'LOGIC', 'LANG', 'SPACE', 'MUSIC', 'KINESTHETIC',
  'INTERPERSONAL', 'INTRAPERSONAL', 'NATURAL',
];
const TENDENCY_DIMENSIONS: TendencyDimension[] = [
  'ALTRUISM', 'FAIRNESS', 'HONESTY', 'EMPATHY', 'RESPONSIBILITY', 'AGGRESSION',
];

export type BankItem = {
  qid: string;
  section: 'IE' | 'IQ' | 'TENDENCY';
  dimension: string;
  type: string;
  stem: string;
  options: { key: string; text: string; score: number }[];
  reverse: boolean;
};

export type ScoreJson = {
  personality: PersonalitySubtype;
  personalityScores: Record<PersonalitySubtype, number>;
  iq: Record<IqDimension, number>;
  iqPercentile: Record<IqDimension, number>;
  tendency: Record<TendencyDimension, TendencyLevel>;
};

function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function scoreAssessment(
  bank: BankItem[],
  answers: Record<string, number>,
): ScoreJson {
  const byDim: Record<string, { sum: number; n: number }> = {};

  for (const item of bank) {
    if (!(item.qid in answers)) continue;
    let s = answers[item.qid]!;
    if (item.reverse) s = 3 - s;
    if (!byDim[item.dimension]) byDim[item.dimension] = { sum: 0, n: 0 };
    byDim[item.dimension]!.sum += s;
    byDim[item.dimension]!.n += 1;
  }

  const personalityScores = {} as Record<PersonalitySubtype, number>;
  let best: PersonalitySubtype = 'I-A';
  let bestVal = -1;
  for (const dim of PERSONALITY_SUBTYPES) {
    const d = byDim[dim];
    const v = d && d.n ? d.sum / (d.n * 3) : 0;
    personalityScores[dim] = Number(v.toFixed(4));
    if (v > bestVal) {
      bestVal = v;
      best = dim;
    }
  }

  const iq = {} as Record<IqDimension, number>;
  const iqPercentile = {} as Record<IqDimension, number>;
  for (const dim of IQ_DIMENSIONS) {
    const d = byDim[dim];
    const raw = d && d.n ? Math.round((d.sum / (d.n * 3)) * 100) : 0;
    iq[dim] = clamp(raw, 0, 100);
    const z = (iq[dim] - 50) / 20;
    iqPercentile[dim] = clamp(Math.round(normCdf(z) * 100), 1, 99);
  }

  const tendency = {} as Record<TendencyDimension, TendencyLevel>;
  for (const dim of TENDENCY_DIMENSIONS) {
    const d = byDim[dim];
    const t = d && d.n ? (d.sum / (d.n * 3)) * 100 : 0;
    tendency[dim] = t < 40 ? 'low' : t < 70 ? 'mid' : 'high';
  }

  return {
    personality: best,
    personalityScores,
    iq,
    iqPercentile,
    tendency,
  };
}
