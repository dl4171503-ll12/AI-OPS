import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSchoolStore } from '@/store/school';
import { speakPrincipalAloud, stopReadAloud } from '@/lib/read-aloud';
import {
  buildCampusReminderText,
  buildWrongHallReminderText,
  getCurrentScheduleSlot,
  getRecentlyEndedSlot,
  normalizeDaySchedule,
  scheduleRemindStorageKey,
  shouldSpeakScheduleRemind,
  subjectHallName,
  subjectHallPath,
} from '@/lib/day-schedule';
import type { SubjectId } from '@/lib/types';
import { DEFAULT_DAY_SCHEDULE } from '@/lib/day-schedule';
import { FREE_LAB_MS } from '@/lib/science-labs';

const TICK_MS = 20_000;
/** 进错楼后停留多久开始催促（毫秒） */
const WRONG_HALL_GRACE_MS = 90_000;

/**
 * 日程校长提醒：
 * - 首页：当前有课却未进入对应教学楼 → 校长语音提醒
 * - 学科楼：当前课是别的科目却还停在本楼 → 校长语音催促换楼
 */
export function ScheduleReminder() {
  useEffect(() => () => { stopReadAloud(); toast.dismiss('campus-schedule'); }, []);
  const location = useLocation();
  const navigate = useNavigate();
  const student = useSchoolStore((s) => s.student);
  const daySchedule = useSchoolStore((s) => s.daySchedule);
  const unlockFreeLab = useSchoolStore((s) => s.unlockFreeLab);
  const freeLabUntil = useSchoolStore((s) => s.freeLabUntil);
  const wrongSinceRef = useRef<number | null>(null);
  const lastPathRef = useRef(location.pathname);

  useEffect(() => {
    if (lastPathRef.current !== location.pathname) {
      lastPathRef.current = location.pathname;
      wrongSinceRef.current = null;
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!student) return;

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      const rows = normalizeDaySchedule(daySchedule?.length ? daySchedule : DEFAULT_DAY_SCHEDULE);
      const slot = getCurrentScheduleSlot(rows);

      // 科学课刚结束：自动提醒并开放 30 分钟自由实验
      const ended = getRecentlyEndedSlot(rows, new Date(), 35);
      if (ended?.subjectId === 'science') {
        const key = scheduleRemindStorageKey('campus', `freelab-${ended.id}`);
        if (shouldSpeakScheduleRemind(key, 25 * 60 * 1000)) {
          const stillOpen = freeLabUntil && new Date(freeLabUntil).getTime() > Date.now();
          if (!stillOpen) unlockFreeLab(FREE_LAB_MS);
          toast.message('阿科老师：科学课结束，自由实验室开放 30 分钟', {
            id: 'campus-schedule',
          action: {
              label: '去做实验',
              onClick: () => navigate('/lab'),
            },
          });
        }
      }

      if (!slot?.subjectId) {
        wrongSinceRef.current = null;
        return;
      }

      const path = location.pathname;
      const onCampus = path === '/' || path === '';
      const hallMatch = path.match(/^\/hall\/([^/]+)/);
      const currentHall = (hallMatch?.[1] || '') as SubjectId | '';

      // 首页：提醒去当前科目楼
      if (onCampus) {
        wrongSinceRef.current = null;
        const key = scheduleRemindStorageKey('campus', slot.id);
        if (!shouldSpeakScheduleRemind(key, 6 * 60 * 1000)) return;
        const text = buildCampusReminderText({
          slot,
          studentName: student.name,
          grade: student.grade,
          gradeYear: student.gradeYear,
        });
        toast.message(`校长提醒：请前往${subjectHallName(slot.subjectId)}`, {
          id: 'campus-schedule',
          action: {
            label: '立刻前往',
            onClick: () => navigate(subjectHallPath(slot.subjectId!)),
          },
        });
        void speakPrincipalAloud(text, student.grade).catch(() => undefined);
        return;
      }

      // 在错误学科楼停留
      if (currentHall && currentHall !== slot.subjectId) {
        if (wrongSinceRef.current == null) wrongSinceRef.current = Date.now();
        const stayed = Date.now() - wrongSinceRef.current;
        if (stayed < WRONG_HALL_GRACE_MS) return;
        const key = scheduleRemindStorageKey('wrong', `${slot.id}-${currentHall}`);
        if (!shouldSpeakScheduleRemind(key, 5 * 60 * 1000)) return;
        const text = buildWrongHallReminderText({
          slot,
          currentSubject: currentHall,
          studentName: student.name,
          grade: student.grade,
          gradeYear: student.gradeYear,
        });
        toast.message(`校长提醒：现在该去${subjectHallName(slot.subjectId)}`, {
          id: 'campus-schedule',
          action: {
            label: '换楼',
            onClick: () => navigate(subjectHallPath(slot.subjectId!)),
          },
        });
        void speakPrincipalAloud(text, student.grade).catch(() => undefined);
        return;
      }

      // 已在正确楼
      if (currentHall === slot.subjectId) {
        wrongSinceRef.current = null;
      }
    };

    void tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [student, daySchedule, location.pathname, navigate, unlockFreeLab, freeLabUntil]);

  return null;
}
