import type { AgeBand, GradeKey, StudentProfile, TeacherTone } from './types';

/** 1–12：小学1–6、初中7–9、高中10–12 */
export type GradeYear = number;

export function yearToGradeKey(year: GradeYear): GradeKey {
  const y = clampYear(year);
  if (y <= 4) return 'primary-low';
  if (y <= 6) return 'primary-high';
  if (y <= 9) return 'middle';
  return 'high';
}

export function yearToBand(year: GradeYear): AgeBand {
  const y = clampYear(year);
  if (y <= 4) return 'low';
  if (y <= 9) return 'mid';
  return 'high';
}

export function clampYear(year: number | undefined | null): GradeYear {
  const n = Number(year);
  if (!Number.isFinite(n)) return 2;
  return Math.min(12, Math.max(1, Math.round(n)));
}

/** 旧数据无 gradeYear 时按学段推断 */
export function resolveGradeYear(student: Pick<StudentProfile, 'grade' | 'gradeYear'> | null | undefined): GradeYear {
  if (student?.gradeYear != null) return clampYear(student.gradeYear);
  switch (student?.grade) {
    case 'primary-low':
      return 2;
    case 'primary-high':
      return 5;
    case 'middle':
      return 7;
    case 'high':
      return 10;
    default:
      return 2;
  }
}

/** 二年级及以下可可爱爱；三年级起正式 */
export function allowsCuteSpeak(year: GradeYear): boolean {
  return clampYear(year) <= 2;
}

/**
 * 有效语气：≥三年级强制正式（忽略可爱）；≤二年级尊重家长设置，默认亲切。
 */
export function effectiveSpeakTone(
  year: GradeYear,
  parentTone?: TeacherTone | null,
  role: 'principal' | 'teacher' = 'teacher',
): TeacherTone {
  if (!allowsCuteSpeak(year)) {
    return 'formal';
  }
  if (role === 'principal') {
    // 低龄校长也可温和，但默认 balanced，避免过度卖萌
    if (parentTone === 'cute') return 'balanced';
    return parentTone || 'balanced';
  }
  return parentTone || 'balanced';
}

export function principalStyleHint(year: GradeYear): string {
  if (allowsCuteSpeak(year)) {
    return '校长寄语气调：温和、庄重中带一点亲切，可用短句鼓励，但不要过度卖萌，不要用「呀/哦/嘻嘻/宝贝」等网络撒娇词。';
  }
  return '校长寄语气调必须严肃、正式、庄重：像真正的校园校长讲话。少用语气词与叠词，禁止「呀/哦/啦/嘛/嘻嘻/宝贝」；称呼用「同学」；鼓励要克制、具体。';
}

export function teacherStyleHint(year: GradeYear): string {
  if (allowsCuteSpeak(year)) {
    return '老师语气：对低年级可适度亲切，讲解清楚、鼓励为主，仍保持教师身份。';
  }
  return '老师语气必须比较正式：课堂用语、礼貌清晰、克制；禁止过度可爱与网络流行语；以讲解与引导思考为主。';
}

export const GRADE_YEAR_OPTIONS: Array<{ year: GradeYear; label: string; band: AgeBand }> = [
  { year: 1, label: '一年级', band: 'low' },
  { year: 2, label: '二年级', band: 'low' },
  { year: 3, label: '三年级', band: 'low' },
  { year: 4, label: '四年级', band: 'low' },
  { year: 5, label: '五年级', band: 'mid' },
  { year: 6, label: '六年级', band: 'mid' },
  { year: 7, label: '初一', band: 'mid' },
  { year: 8, label: '初二', band: 'mid' },
  { year: 9, label: '初三', band: 'mid' },
  { year: 10, label: '高一', band: 'high' },
  { year: 11, label: '高二', band: 'high' },
  { year: 12, label: '高三', band: 'high' },
];
