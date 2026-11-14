import textbookMap from '@/data/ops/textbook_map.json';
import type { SubjectId, TextbookEditionPrefs } from '@/lib/types';
import { DEFAULT_EDITION_PREFS } from '@/lib/types';

export type TextbookMapEntry = {
  subject: string;
  version: string;
  versionName: string;
  stage: string;
  grades: number[];
  usageProvinces: string[];
  officialEntry: string;
  verified: boolean;
  note: string;
};

const MAP = textbookMap as TextbookMapEntry[];

const SUBJECT_CODE: Partial<Record<SubjectId, string>> = {
  chinese: 'YW',
  math: 'SX',
  english: 'YY',
  science: 'KX',
  art: 'YS',
  pe: 'TY',
};

export function stageForGrade(gradeYear: number): 'primary' | 'junior' | 'senior' {
  if (gradeYear <= 6) return 'primary';
  if (gradeYear <= 9) return 'junior';
  return 'senior';
}

export function versionsForSubject(subject: SubjectId, gradeYear = 5): TextbookMapEntry[] {
  const code = SUBJECT_CODE[subject];
  if (!code) return [];
  const stage = stageForGrade(gradeYear);
  const exact = MAP.filter(
    (e) => e.subject === code && e.stage === stage && e.grades.includes(gradeYear),
  );
  if (exact.length) return exact;
  return MAP.filter((e) => e.subject === code && e.stage === stage);
}

export function resolveEdition(
  prefs: TextbookEditionPrefs | null | undefined,
  subject: SubjectId,
  gradeYear = 5,
): TextbookMapEntry | null {
  const list = versionsForSubject(subject, gradeYear);
  if (!list.length) return null;
  const p = prefs || DEFAULT_EDITION_PREFS;
  const code =
    subject === 'chinese' ? p.chinese : subject === 'math' ? p.math : subject === 'english' ? p.english : '';
  return list.find((e) => e.version === code) || list[0] || null;
}

export function editionLabel(entry: TextbookMapEntry | null): string {
  if (!entry) return '未指定版本';
  return `${entry.versionName}（${entry.version}）`;
}

/** 注入老师上下文的一行说明 */
export function editionContextLine(
  prefs: TextbookEditionPrefs | null | undefined,
  subject: SubjectId,
  gradeYear?: number,
): string {
  const e = resolveEdition(prefs, subject, gradeYear ?? 5);
  if (!e) return '';
  return `教材版本：${e.versionName}（代码 ${e.version}，学段 ${e.stage}）。讲解与例题对齐该版本课标骨架，勿照搬教材原文。官方入口：${e.officialEntry}`;
}

export { MAP as TEXTBOOK_MAP };
