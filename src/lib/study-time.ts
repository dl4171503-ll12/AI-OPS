import type { SubjectId, StudyTimePlan } from './types';

export type { StudyTimePlan };

/** 主科 */
export const MAJOR_SUBJECTS: SubjectId[] = ['math', 'chinese', 'english'];
/** 副科 */
export const MINOR_SUBJECTS: SubjectId[] = ['science', 'art', 'pe'];

export const DEFAULT_STUDY_TIME_PLAN: StudyTimePlan = {
  dailyMinutes: 120,
  majorPercent: 70,
  majorSplit: { math: 34, chinese: 33, english: 33 },
  minorSplit: { science: 34, art: 33, pe: 33 },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** 规范化占比，保证主科 0–100，分项合计约 100 */
export function normalizeStudyTimePlan(raw: Partial<StudyTimePlan> | null | undefined): StudyTimePlan {
  const base = { ...DEFAULT_STUDY_TIME_PLAN, ...(raw || {}) };
  const majorPercent = clamp(base.majorPercent ?? 70, 0, 100);
  const dailyMinutes = clamp(base.dailyMinutes ?? 120, 30, 480);

  const majorSplit = {
    math: clamp(base.majorSplit?.math ?? 34, 0, 100),
    chinese: clamp(base.majorSplit?.chinese ?? 33, 0, 100),
    english: clamp(base.majorSplit?.english ?? 33, 0, 100),
  };
  const mSum = majorSplit.math + majorSplit.chinese + majorSplit.english || 1;
  majorSplit.math = clamp((majorSplit.math / mSum) * 100, 0, 100);
  majorSplit.chinese = clamp((majorSplit.chinese / mSum) * 100, 0, 100);
  majorSplit.english = clamp(100 - majorSplit.math - majorSplit.chinese, 0, 100);

  const minorSplit = {
    science: clamp(base.minorSplit?.science ?? 34, 0, 100),
    art: clamp(base.minorSplit?.art ?? 33, 0, 100),
    pe: clamp(base.minorSplit?.pe ?? 33, 0, 100),
  };
  const nSum = minorSplit.science + minorSplit.art + minorSplit.pe || 1;
  minorSplit.science = clamp((minorSplit.science / nSum) * 100, 0, 100);
  minorSplit.art = clamp((minorSplit.art / nSum) * 100, 0, 100);
  minorSplit.pe = clamp(100 - minorSplit.science - minorSplit.art, 0, 100);

  return { dailyMinutes, majorPercent, majorSplit, minorSplit };
}

export type SubjectMinutes = Record<SubjectId, number> & {
  majorTotal: number;
  minorTotal: number;
};

/** 按计划折算各科每日分钟 */
export function computeSubjectMinutes(plan: StudyTimePlan): SubjectMinutes {
  const p = normalizeStudyTimePlan(plan);
  const majorTotal = Math.round((p.dailyMinutes * p.majorPercent) / 100);
  const minorTotal = Math.max(0, p.dailyMinutes - majorTotal);
  return {
    math: Math.round((majorTotal * p.majorSplit.math) / 100),
    chinese: Math.round((majorTotal * p.majorSplit.chinese) / 100),
    english: Math.round((majorTotal * p.majorSplit.english) / 100),
    science: Math.round((minorTotal * p.minorSplit.science) / 100),
    art: Math.round((minorTotal * p.minorSplit.art) / 100),
    pe: Math.round((minorTotal * p.minorSplit.pe) / 100),
    ai: 0,
    majorTotal,
    minorTotal,
  };
}

export function studyTimeSummaryText(plan: StudyTimePlan): string {
  const p = normalizeStudyTimePlan(plan);
  const m = computeSubjectMinutes(p);
  return [
    `每日 ${p.dailyMinutes} 分钟：主科 ${p.majorPercent}%（${m.majorTotal}分）/ 副科 ${100 - p.majorPercent}%（${m.minorTotal}分）`,
    `主科：数学${m.math} · 语文${m.chinese} · 英语${m.english}`,
    `副科：科学${m.science} · 艺术${m.art} · 体育${m.pe}`,
  ].join('；');
}
