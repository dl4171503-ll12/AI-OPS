import type { DayScheduleRow, SubjectId } from './types';
import { SUBJECTS, getStudentTitle, type GradeKey } from './types';

export type { DayScheduleRow };

export const DEFAULT_DAY_SCHEDULE: DayScheduleRow[] = [
  { id: 'sch-1', start: '08:00', end: '09:00', subjectLabel: '语文', subjectId: 'chinese' },
  { id: 'sch-2', start: '09:10', end: '10:10', subjectLabel: '数学', subjectId: 'math' },
  { id: 'sch-3', start: '10:20', end: '11:20', subjectLabel: '英语', subjectId: 'english' },
  { id: 'sch-4', start: '14:00', end: '14:50', subjectLabel: '科学', subjectId: 'science' },
  { id: 'sch-5', start: '15:00', end: '15:50', subjectLabel: '艺术', subjectId: 'art' },
  { id: 'sch-6', start: '16:00', end: '16:40', subjectLabel: '体育', subjectId: 'pe' },
];

const ALIASES: Array<{ id: SubjectId; keys: string[] }> = [
  { id: 'math', keys: ['数学', '数学楼', 'math', '算术', '口算'] },
  {
    id: 'chinese',
    keys: ['语文', '语文楼', 'chinese', '中文', '阅读', '作文', '历史', '地理', '史地', '文史'],
  },
  { id: 'english', keys: ['英语', '英语楼', 'english', '英文'] },
  {
    id: 'science',
    keys: ['科学', '科学楼', 'science', '自然', '物理', '化学', '生物', '物化生', '实验'],
  },
  { id: 'art', keys: ['艺术', '艺术楼', '美术', '美术楼', 'art', '绘画'] },
  { id: 'ai', keys: ['ai', 'AI', '人工智能', 'AI楼', 'ai楼', 'AI中心', 'ai中心', '小智'] },
  { id: 'pe', keys: ['体育', '体育中心', 'pe', '运动', '体能'] },
];

/** 把家长填写的科目名自动匹配为学科 ID */
export function matchSubjectLabel(label: string): SubjectId | null {
  const t = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  if (!t) return null;
  for (const a of ALIASES) {
    if (a.keys.some((k) => t === k.toLowerCase() || t.includes(k.toLowerCase()))) return a.id;
  }
  const byName = SUBJECTS.find(
    (s) => t.includes(s.name.replace(/楼|中心/g, '')) || s.name.includes(String(label || '').trim()),
  );
  return byName?.id || null;
}

export function subjectHallName(id: SubjectId | null): string {
  if (!id) return '对应教学楼';
  return SUBJECTS.find((s) => s.id === id)?.name || id;
}

export function subjectHallPath(id: SubjectId): string {
  return `/hall/${id}`;
}

function parseHm(hm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || '').trim());
  if (!m) return -1;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return -1;
  return h * 60 + min;
}

export function formatHm(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function normalizeScheduleRow(row: Partial<DayScheduleRow> & { id?: string }): DayScheduleRow {
  const label = String(row.subjectLabel || '').trim() || '未命名';
  const matched = matchSubjectLabel(label);
  let start = String(row.start || '08:00');
  let end = String(row.end || '09:00');
  if (parseHm(start) < 0) start = '08:00';
  if (parseHm(end) < 0) end = '09:00';
  if (parseHm(end) <= parseHm(start)) {
    end = formatHm(Math.min(23 * 60 + 59, parseHm(start) + 50));
  }
  return {
    id: row.id || `sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    start,
    end,
    subjectLabel: label,
    subjectId: matched,
  };
}

export function normalizeDaySchedule(rows: DayScheduleRow[] | null | undefined): DayScheduleRow[] {
  const list =
    Array.isArray(rows) && rows.length ? rows.map((r) => normalizeScheduleRow(r)) : [...DEFAULT_DAY_SCHEDULE];
  return [...list].sort((a, b) => parseHm(a.start) - parseHm(b.start));
}

export function moveScheduleRow(rows: DayScheduleRow[], id: string, dir: -1 | 1): DayScheduleRow[] {
  const list = [...rows];
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return list;
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const tmp = list[i];
  list[i] = list[j];
  list[j] = tmp;
  return list;
}

/** 当前时刻应上的课 */
export function getCurrentScheduleSlot(rows: DayScheduleRow[], now = new Date()): DayScheduleRow | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  const sorted = normalizeDaySchedule(rows);
  return (
    sorted.find((r) => {
      const a = parseHm(r.start);
      const b = parseHm(r.end);
      return a >= 0 && b >= 0 && mins >= a && mins < b;
    }) || null
  );
}

export function getNextScheduleSlot(rows: DayScheduleRow[], now = new Date()): DayScheduleRow | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  const sorted = normalizeDaySchedule(rows);
  return sorted.find((r) => parseHm(r.start) > mins) || null;
}

/** 刚结束不久的课（默认结束 0～35 分钟内），用于科学课后自由实验提醒 */
export function getRecentlyEndedSlot(
  rows: DayScheduleRow[],
  now = new Date(),
  withinMinutes = 35,
): DayScheduleRow | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  const sorted = normalizeDaySchedule(rows);
  let best: DayScheduleRow | null = null;
  let bestEnd = -1;
  for (const r of sorted) {
    const b = parseHm(r.end);
    if (b < 0) continue;
    if (mins >= b && mins < b + withinMinutes && b >= bestEnd) {
      best = r;
      bestEnd = b;
    }
  }
  return best;
}

export function buildCampusReminderText(opts: {
  slot: DayScheduleRow;
  studentName: string;
  grade?: GradeKey;
  gradeYear?: number;
}): string {
  const title = getStudentTitle(opts.grade, opts.gradeYear);
  const hall = subjectHallName(opts.slot.subjectId);
  const label = opts.slot.subjectLabel || hall;
  return `${title}${opts.studentName}，现在是${opts.slot.start}到${opts.slot.end}的${label}课时间。请立刻前往${hall}学习。`;
}

export function buildWrongHallReminderText(opts: {
  slot: DayScheduleRow;
  currentSubject: SubjectId;
  studentName: string;
  grade?: GradeKey;
  gradeYear?: number;
}): string {
  const title = getStudentTitle(opts.grade, opts.gradeYear);
  const cur = subjectHallName(opts.currentSubject);
  const hall = subjectHallName(opts.slot.subjectId);
  const label = opts.slot.subjectLabel || hall;
  return `${title}${opts.studentName}，现在日程是${label}，请离开${cur}，前往${hall}继续学习。不要只停留在一个学科楼。`;
}

export function scheduleRemindStorageKey(kind: 'campus' | 'wrong', slotId: string, day = new Date()): string {
  const d = day.toISOString().slice(0, 10);
  return `ai-school-sched-remind-${d}-${kind}-${slotId}`;
}

export function shouldSpeakScheduleRemind(key: string, intervalMs = 8 * 60 * 1000): boolean {
  try {
    const raw = sessionStorage.getItem(key);
    const last = raw ? Number(raw) : 0;
    if (last && Date.now() - last < intervalMs) return false;
    sessionStorage.setItem(key, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}
