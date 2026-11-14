function readOnlyGuardianCache(p:any){return p?{cultureEnabled:Boolean(p.cultureEnabled),allowSocial:p.allowSocial!==false,socialView:p.socialView==='summary'?'summary' as const:'full' as const,teacherTone:p.teacherTone,encourageMsg:p.encourageMsg}:{};}
import type { AdmissionState } from '@/lib/admission';
import { initialOps, normalizeOps, mastery, diagnose, localDate, weekStart, subjectScore, OPS_CONFIG, type OpsState } from '@/lib/ops';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  AgeBand,
  AssessmentResult,
  ChatMessage,
  DailyPlan,
  EmotionLog,
  Friend,
  GradeKey,
  InterestProfile,
  IqeResult,
  LabMission,
  PracticeRecord,
  PrincipalIntakeReport,
  SchoolState,
  SocialMessage,
  StudentProfile,
  SubjectId,
  TextbookEditionPrefs,
  WrongItem,
} from '@/lib/types';
import { DEFAULT_EDITION_PREFS, gradeToBand, type StudyTimePlan } from '@/lib/types';
import { DEFAULT_STUDY_TIME_PLAN, normalizeStudyTimePlan } from '@/lib/study-time';
import { yearToBand, yearToGradeKey, clampYear } from '@/lib/grade-speak';
import { getStoredContact } from '@/lib/phone-auth';
import { DEFAULT_DAY_SCHEDULE, normalizeDaySchedule, type DayScheduleRow } from '@/lib/day-schedule';

function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function schoolId() {
  return `SCH-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString().slice(-4)}`;
}

function inviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** 旧存档无该字段时：已有学生视为面谈完成，避免「返回校园」被拦回校长室 */
export function resolvePrincipalIntakeDone(
  value: boolean | undefined,
  hasStudent: boolean,
): boolean {
  if (value === undefined) return hasStudent;
  return !!value;
}

/** 按手机号隔离本地记忆；未登录用 guest */
function accountStorageKey(base: string): string {
  const contact = getStoredContact();
  return contact ? `${base}:${contact.kind === 'phone' ? 'p' : 'e'}:${contact.value}` : `${base}:guest`;
}

const accountStorage: {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
} = {
  getItem: (name) => {
    try {
      const key = accountStorageKey(name);
      const hit = localStorage.getItem(key);
      if (hit) return hit;
      // 兼容旧版单一 key（迁移到 guest）
      if (key.endsWith(':guest')) {
        const legacy = localStorage.getItem(name);
        if (legacy) {
          localStorage.setItem(key, legacy);
          return legacy;
        }
      }
      return null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(accountStorageKey(name), value);
    } catch {
      /* ignore */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(accountStorageKey(name));
    } catch {
      /* ignore */
    }
  },
};

const initial: SchoolState = {
  ops: initialOps(),
  admission: null,
  schoolSetupCompletedAt: undefined,
  student: null,
  assessments: {},
  plans: {},
  studyTimePlan: { ...DEFAULT_STUDY_TIME_PLAN },
  wrongBook: [],
  practices: [],
  principalChat: [],
  counselorChat: [],
  emotions: [],
  interests: { sports: 0, art: 0, music: 0, coding: 0, literature: 0 },
  friends: [],
  socialInbox: [],
  exploreNotes: [],
  parent: { socialView: 'full', allowSocial: true, teacherTone: 'balanced' },
  daySchedule: [...DEFAULT_DAY_SCHEDULE],
  funUnlockedToday: false,
  freeLabUntil: null,
  labCompletedIds: [],
  labMission: null,
  aiSkillLevel: null,
  principalIntakeDone: false,
  principalIntake: null,
  iqeResult: null,
  editionPrefs: { ...DEFAULT_EDITION_PREFS },
  promotionReady: false,
  showPromotion: false,
};

type Actions = {
  setAdmission: (data: AdmissionState) => void;
  completeSchoolSetup: () => void;
  buyStreakFreeze: () => boolean;
  repairStreak: () => boolean;
  updateOps: (update: (ops: OpsState) => OpsState) => void;
  awardXp: (id: string, subject: SubjectId | undefined, amount: number, reason: string) => void;
  createSchool: (opts: { name: string; avatar: string; grade?: GradeKey; gradeYear: number }) => void;
  updateAvatar: (avatar: string) => void;
  bumpStudyDay: () => void;
  setAssessment: (a: AssessmentResult) => void;
  setPlan: (p: DailyPlan) => void;
  setPlansFromPrincipal: (plans: Partial<Record<SubjectId, DailyPlan>>, report: PrincipalIntakeReport) => void;
  completePrincipalIntake: () => void;
  setIqeResult: (result: IqeResult) => void;
  setEditionPrefs: (prefs: Partial<TextbookEditionPrefs>) => void;
  toggleTask: (subject: SubjectId, taskId: string) => void;
  addPractice: (p: Omit<PracticeRecord, 'id' | 'createdAt'>) => void;
  retryRemoveWrong: (id: string) => void;
  pushChat: (which: 'principal' | 'counselor', msg: Omit<ChatMessage, 'id' | 'at'>) => void;
  addEmotion: (e: Omit<EmotionLog, 'id' | 'at'>) => void;
  bumpInterest: (key: keyof InterestProfile, n?: number) => void;
  addExploreNote: (note: string) => void;
  addFriend: (f: Friend) => void;
  addSocial: (m: Omit<SocialMessage, 'id' | 'at'>) => void;
  setParent: (p: Partial<SchoolState['parent']>) => void;
  adjustStudentProgress: (opts: {
    studyDays?: number;
    points?: number;
    grade?: GradeKey;
    gradeYear?: number;
    assessmentScores?: Partial<Record<SubjectId, number>>;
    markTasksDone?: Partial<Record<SubjectId, boolean>>;
    studyTimePlan?: Partial<StudyTimePlan>;
  }) => void;
  setStudyTimePlan: (plan: Partial<StudyTimePlan>) => void;
  setDaySchedule: (rows: DayScheduleRow[]) => void;
  setMorningBrief: (content: string, daypart?: string) => void;
  unlockFun: () => void;
  /** 科学课结束后开放自由实验室（默认 30 分钟） */
  unlockFreeLab: (durationMs?: number) => void;
  clearFreeLab: () => void;
  markLabCompleted: (expId: string) => void;
  setLabMission: (mission: LabMission | null) => void;
  grantLabMissionAccess: () => void;
  beginLabMissionReflect: () => void;
  completeLabMissionFindings: (findings: string) => void;
  setAiSkillLevel: (level: 'image' | 'web' | 'exam' | 'zero') => void;
  checkPromotion: () => void;
  completePromotion: () => void;
  dismissPromotion: () => void;
  addPoints: (n: number) => void;
  unlockDecoration: (id: string) => void;
  earnBadge: (badge: string) => void;
  resetAll: () => void;
  /** 登录后切换账号槽：从当前 storage 重新灌入 */
  reloadFromAccountStorage: () => void;
};

export const useSchoolStore = create<SchoolState & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      setAdmission: (admission) => set({ admission }),
      completeSchoolSetup: () => set({ schoolSetupCompletedAt: new Date().toISOString() }),
      buyStreakFreeze: () => {
        const { student, ops } = get();
        if (!student || student.points < 150) return false;
        set({ student: { ...student, points: student.points - 150 }, ops: { ...ops, freezes: ops.freezes + 1 } });
        return true;
      },
      repairStreak: () => {
        const { student, ops } = get();
        const broken = ops.brokenStreak;
        if (!student || !broken || broken.gap > 7 || Date.parse(localDate()) - Date.parse(broken.at) > 7 * 86400000) return false;
        const month = localDate().slice(0, 7);
        const repairs = ops.repairMonth === month ? ops.repairs ?? 1 : 1;
        if (repairs <= 0 && student.points < 200) return false;
        set({ student: { ...student, points: student.points - (repairs > 0 ? 0 : 200) }, ops: { ...ops, streak: broken.value + ops.streak, brokenStreak: undefined, repairMonth: month, repairs: Math.max(0, repairs - 1) } });
        return true;
      },
      updateOps: (update) => set({ ops: update(get().ops) }),
      awardXp: (id, subject, amount, reason) => {
        const state = get();
        if (!state.student || !Number.isFinite(amount) || amount <= 0 || state.ops.awards.some(a => a.id === id)) return;
        const at = new Date().toISOString();
        set({ student: { ...state.student, points: state.student.points + amount }, ops: { ...state.ops, xpTotal: state.ops.xpTotal + amount, awards: [...state.ops.awards, { id, subject, amount, reason, at }] } });
        if (get().ops.xpTotal >= 1000) get().earnBadge('累计 1000 XP');
        if (subject) {
          const week = weekStart(); const updated = get().ops;
          const ids: SubjectId[] = ['math', 'chinese', 'english', 'science', 'art', 'pe', 'ai'];
          if (subjectScore(updated, subject) >= 500) get().earnBadge(subject + ' 能力分 500');
          if (subjectScore(updated, subject, week) >= 100) get().awardXp('week-' + week + '-' + subject, undefined, 50, '单科周成长');
          const count = ids.filter(s => subjectScore(updated, s, week) >= 100).length;
          if (count >= 3) get().awardXp('week-three-' + week, undefined, 120, '三科周成长');
          if (count === 7) get().awardXp('week-all-' + week, undefined, 300, '七科周成长');
        }
      },
      createSchool: ({ name, avatar, grade, gradeYear }) => {
        const year = clampYear(gradeYear);
        const g = grade || yearToGradeKey(year);
        const student: StudentProfile = {
          id: uid('stu'),
          name: name.trim() || '小朋友',
          avatar,
          grade: g,
          gradeYear: year,
          ageBand: yearToBand(year) || gradeToBand(g),
          schoolId: schoolId(),
          inviteCode: inviteCode(),
          createdAt: new Date().toISOString(),
          studyDays: 1,
          lastStudyDate: new Date().toISOString().slice(0, 10),
          points: 20,
          badges: ['入学徽章'],
          decorations: ['小树苗'],
        };
        set({ ...initial, ops: initialOps(20), student, studyTimePlan: { ...DEFAULT_STUDY_TIME_PLAN } });
      },
      setStudyTimePlan: (plan) => {
        set({
          studyTimePlan: normalizeStudyTimePlan({
            ...get().studyTimePlan,
            ...plan,
            majorSplit: { ...get().studyTimePlan.majorSplit, ...plan.majorSplit },
            minorSplit: { ...get().studyTimePlan.minorSplit, ...plan.minorSplit },
          }),
        });
      },
      setDaySchedule: (rows) => set({ daySchedule: normalizeDaySchedule(rows) }),
      updateAvatar: (avatar) => {
        const s = get().student;
        if (!s) return;
        set({ student: { ...s, avatar } });
      },
      bumpStudyDay: () => {
        const s = get().student;
        if (!s) return;
        const today = localDate();
        const ops = get().ops;
        if (ops.lastActive === today) return;
        const gap = ops.lastActive ? Math.round((Date.parse(today) - Date.parse(ops.lastActive)) / 86400000) : 1;
        const frozen = gap === 2 && ops.freezes > 0;
        const streak = gap === 1 ? ops.streak + 1 : frozen ? ops.streak : 1;
        set({ student: { ...s, studyDays: s.studyDays + (s.lastStudyDate === today ? 0 : 1), lastStudyDate: today }, funUnlockedToday: s.lastStudyDate === today ? get().funUnlockedToday : false, ops: { ...ops, streak, lastActive: today, brokenStreak: gap > 1 && !frozen && ops.streak > 0 ? { value: ops.streak, at: today, gap: gap - 1 } : ops.brokenStreak, freezes: ops.freezes - (frozen ? 1 : 0) } });
        if (OPS_CONFIG.milestones.includes(streak) && !ops.celebrated.includes(streak)) {
          get().awardXp('streak-' + streak, undefined, 30, '学习里程碑');
          get().earnBadge(streak + ' 天学习里程碑');
          get().updateOps(o => ({ ...o, celebrated: [...o.celebrated, streak] }));
        }
      },
      setAssessment: (a) => set({ assessments: { ...get().assessments, [a.subject]: a } }),
      setPlan: (p) => set({ plans: { ...get().plans, [p.subject]: p } }),
      setPlansFromPrincipal: (plans, report) =>
        set({
          plans: { ...get().plans, ...plans },
          principalIntake: report,
          principalIntakeDone: true,
        }),
      completePrincipalIntake: () => set({ principalIntakeDone: true }),
      setIqeResult: (result) =>
        set((s) => ({
          iqeResult: result,
          student: s.student
            ? {
                ...s.student,
                badges: s.student.badges.includes('多维测评')
                  ? s.student.badges
                  : [...s.student.badges, '多维测评'],
              }
            : s.student,
        })),
      setEditionPrefs: (prefs) =>
        set((s) => ({
          editionPrefs: { ...(s.editionPrefs || DEFAULT_EDITION_PREFS), ...prefs },
        })),
      toggleTask: (subject, taskId) => {
        const plan = get().plans[subject];
        if (!plan) return;
        const tasks = plan.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
        const next = { ...plan, tasks };
        set({ plans: { ...get().plans, [subject]: next } });
        if (tasks.every((t) => t.done)) {
          get().unlockFun();
          get().earnBadge(`${subject}-今日通关`);
          get().awardXp('task-' + subject + '-' + plan.date, subject, 15, '今日任务');
        }
        get().checkPromotion();
      },
      addPractice: (p) => {
        const rec: PracticeRecord = { ...p, id: uid('pr'), createdAt: new Date().toISOString() };
        rec.cause = p.cause || diagnose(p);
        const practices = [rec, ...get().practices];
        if (p.unitId) rec.masteryAfter = mastery(practices, p.unitId);
        let wrongBook = get().wrongBook;
        if (!p.correct) {
          const w: WrongItem = {
            id: uid('w'),
            subject: p.subject,
            knowledge: p.knowledge,
            question: p.question,
            userAnswer: p.userAnswer,
            correctAnswer: '',
            cause: rec.cause,
            practiceId: rec.id,
            explanation: p.explanation,
            createdAt: rec.createdAt,
          };
          wrongBook = [w, ...wrongBook];
        }
        if (p.correct && p.retryOf) wrongBook = wrongBook.filter(w => w.id !== p.retryOf);
        set({ practices, wrongBook });
        get().awardXp(rec.id, p.subject, p.correct ? OPS_CONFIG.correctXp : OPS_CONFIG.effortXp, '练习');
        get().earnBadge('开始探索');
        if (p.reasoning?.trim()) get().earnBadge('说出我的思路');
        if (practices.length >= OPS_CONFIG.questionsPerLevel) get().earnBadge('完成第一个小关');
        get().checkPromotion();
      },
      retryRemoveWrong: (id) => set({ wrongBook: get().wrongBook.filter((w) => w.id !== id) }),
      pushChat: (which, msg) => {
        const item: ChatMessage = { ...msg, id: uid('c'), at: new Date().toISOString() };
        if (which === 'principal') set({ principalChat: [...get().principalChat, item].slice(-80) });
        else set({ counselorChat: [...get().counselorChat, item].slice(-80) });
      },
      addEmotion: (e) =>
        set({ emotions: [{ ...e, id: uid('e'), at: new Date().toISOString() }, ...get().emotions].slice(0, 100) }),
      bumpInterest: (key, n = 1) => {
        const cur = get().interests || { sports: 0, art: 0, music: 0, coding: 0, literature: 0 };
        const interests = {
          sports: cur.sports || 0,
          art: cur.art || 0,
          music: cur.music || 0,
          coding: cur.coding || 0,
          literature: cur.literature || 0,
          [key]: (Number(cur[key]) || 0) + n,
        };
        set({ interests });
      },
      addExploreNote: (note) => set({ exploreNotes: [note, ...get().exploreNotes].slice(0, 50) }),
      addFriend: (f) => {
        if (get().friends.some((x) => x.schoolId === f.schoolId)) return;
        set({ friends: [...get().friends, f] });
      },
      addSocial: (m) =>
        set({ socialInbox: [{ ...m, id: uid('sm'), at: new Date().toISOString() }, ...get().socialInbox].slice(0, 200) }),
      setParent: (p) => set({ parent: { ...get().parent, ...p } }),
      adjustStudentProgress: (opts) => {
        const s = get().student;
        if (!s) return;
        const year = opts.gradeYear != null ? clampYear(opts.gradeYear) : s.gradeYear;
        const grade = opts.grade ?? (year != null ? yearToGradeKey(year) : s.grade);
        const student = {
          ...s,
          studyDays: opts.studyDays ?? s.studyDays,
          points: opts.points ?? s.points,
          grade,
          gradeYear: year ?? s.gradeYear,
          ageBand: year != null ? yearToBand(year) : gradeToBand(grade),
        };
        const patch: Partial<SchoolState> = { student };
        if (opts.points != null && opts.points > s.points) patch.ops = { ...get().ops, xpTotal: get().ops.xpTotal + opts.points - s.points };
        if (opts.studyTimePlan) {
          patch.studyTimePlan = normalizeStudyTimePlan({
            ...get().studyTimePlan,
            ...opts.studyTimePlan,
            majorSplit: { ...get().studyTimePlan.majorSplit, ...opts.studyTimePlan.majorSplit },
            minorSplit: { ...get().studyTimePlan.minorSplit, ...opts.studyTimePlan.minorSplit },
          });
        }
        set(patch);

        if (opts.assessmentScores) {
          const assessments = { ...get().assessments };
          for (const [sid, score] of Object.entries(opts.assessmentScores)) {
            if (typeof score !== 'number') continue;
            const id = sid as SubjectId;
            const prev = assessments[id];
            assessments[id] = {
              subject: id,
              done: true,
              score: Math.max(0, Math.min(100, score)),
              strengths: prev?.strengths || ['家长调整'],
              weaknesses: prev?.weaknesses || [],
              mastery: prev?.mastery || { 综合: score >= 60 ? 1 : 0 },
              completedAt: new Date().toISOString(),
            };
          }
          set({ assessments });
        }

        if (opts.markTasksDone) {
          const plans = { ...get().plans };
          for (const [sid, done] of Object.entries(opts.markTasksDone)) {
            const id = sid as SubjectId;
            const plan = plans[id];
            if (!plan) continue;
            plans[id] = {
              ...plan,
              tasks: plan.tasks.map((t) => ({ ...t, done: Boolean(done) })),
            };
          }
          set({ plans });
          if (Object.values(opts.markTasksDone).some(Boolean)) get().unlockFun();
        }
        get().checkPromotion();
      },
      setMorningBrief: (content, daypart) =>
        set({
          morningBrief: {
            date: new Date().toISOString().slice(0, 10),
            content,
            daypart,
          },
        }),
      unlockFun: () => set({ funUnlockedToday: true }),
      unlockFreeLab: (durationMs = 30 * 60 * 1000) => {
        const until = new Date(Date.now() + durationMs).toISOString();
        set({ freeLabUntil: until });
      },
      clearFreeLab: () => set({ freeLabUntil: null }),
      markLabCompleted: (expId: string) => {
        const prev = get().labCompletedIds || [];
        if (prev.includes(expId)) return;
        set({ labCompletedIds: [...prev, expId] });
        get().awardXp('lab-' + expId, 'science', 5, '实验完成');
      },
      setLabMission: (mission) => set({ labMission: mission }),
      grantLabMissionAccess: () => {
        const m = get().labMission;
        if (!m || (m.phase !== 'await_ack' && m.phase !== 'open')) return;
        const durationMs = m.durationMs || 15 * 60 * 1000;
        const until = new Date(Date.now() + durationMs).toISOString();
        set({
          freeLabUntil: until,
          labMission: {
            ...m,
            phase: 'open',
            openedAt: new Date().toISOString(),
            until,
          },
        });
      },
      beginLabMissionReflect: () => {
        const m = get().labMission;
        if (!m || m.phase === 'done') {
          set({ freeLabUntil: null });
          return;
        }
        if (m.phase === 'reflect') {
          set({ freeLabUntil: null });
          return;
        }
        set({
          freeLabUntil: null,
          labMission: {
            ...m,
            phase: 'reflect',
            until: undefined,
          },
        });
      },
      completeLabMissionFindings: (findings: string) => {
        const m = get().labMission;
        if (!m) return;
        set({
          freeLabUntil: null,
          labMission: {
            ...m,
            phase: 'done',
            findings: findings.trim(),
            until: undefined,
          },
        });
        get().addPoints(3);
      },
      setAiSkillLevel: (level) => set({ aiSkillLevel: level }),
      checkPromotion: () => {
        const { student, assessments, practices } = get();
        if (!student || student.ageBand === 'high') return;
        const doneSubjects = (['math', 'chinese', 'english'] as SubjectId[]).filter(
          (s) => assessments[s]?.done && (assessments[s]?.score || 0) >= 60,
        ).length;
        const practiceOk = practices.filter((p) => p.correct).length >= 8;
        if (doneSubjects >= 2 && practiceOk && student.studyDays >= 2) {
          set({ promotionReady: true });
        }
      },
      completePromotion: () => {
        const s = get().student;
        if (!s) return;
        const nextBand: AgeBand = s.ageBand === 'low' ? 'mid' : 'high';
        const nextGrade =
          nextBand === 'mid' ? (s.grade === 'primary-low' ? 'primary-high' : 'middle') : 'high';
        set({
          student: {
            ...s,
            ageBand: nextBand,
            grade: nextGrade as GradeKey,
            badges: [...new Set([...s.badges, `${bandBadge(s.ageBand)}毕业`, `${bandBadge(nextBand)}入学`])],
            points: s.points,
            promotedFrom: s.ageBand,
          },
          promotionReady: false,
          showPromotion: true,
        });
        get().awardXp('promotion-' + nextBand, undefined, 100, '成长里程碑');
      },
      dismissPromotion: () => set({ showPromotion: false }),
      addPoints: (n) => {
        const s = get().student;
        if (!s) return;
        if (n > 0) get().awardXp(uid('award'), undefined, n, '校园活动');
      },
      unlockDecoration: (id) => {
        const s = get().student;
        if (!s || s.decorations.includes(id)) return;
        if (s.points < 30) return;
        set({ student: { ...s, points: s.points - 30, decorations: [...s.decorations, id] } });
      },
      earnBadge: (badge) => {
        const s = get().student;
        if (!s || s.badges.includes(badge)) return;
        set({ student: { ...s, badges: [...s.badges, badge] } });
      },
      resetAll: () => set({ ...initial }),
      reloadFromAccountStorage: () => {
        try {
          const raw = accountStorage.getItem('ai-one-person-school-v1');
          if (!raw) {
            set({ ...initial });
            return;
          }
          const parsed = JSON.parse(raw) as { state?: Partial<SchoolState> };
          const p = (parsed.state || parsed) as Partial<SchoolState>;
          const student = p.student
            ? {
                ...p.student,
                badges: Array.isArray(p.student.badges) ? p.student.badges : [],
                decorations: Array.isArray(p.student.decorations) ? p.student.decorations : [],
              }
            : null;
          set({
            ...initial,
            ...p,
            student,
            ops: normalizeOps(p.ops, student?.points),
            assessments: p.assessments && typeof p.assessments === 'object' ? p.assessments : {},
            plans: p.plans && typeof p.plans === 'object' ? p.plans : {},
            practices: Array.isArray(p.practices) ? p.practices : [],
            wrongBook: Array.isArray(p.wrongBook) ? p.wrongBook : [],
            studyTimePlan: normalizeStudyTimePlan(p.studyTimePlan || DEFAULT_STUDY_TIME_PLAN),
            daySchedule: normalizeDaySchedule(p.daySchedule || DEFAULT_DAY_SCHEDULE),
            freeLabUntil: p.freeLabUntil ?? null,
            labCompletedIds: Array.isArray(p.labCompletedIds) ? p.labCompletedIds : [],
            labMission: p.labMission ?? null,
            aiSkillLevel: p.aiSkillLevel ?? null,
            principalIntakeDone: resolvePrincipalIntakeDone(p.principalIntakeDone, !!student),
            principalIntake: p.principalIntake ?? null,
            iqeResult: p.iqeResult ?? null,
            editionPrefs: { ...DEFAULT_EDITION_PREFS, ...(p.editionPrefs || {}) },
            parent: {
              ...initial.parent,
              ...readOnlyGuardianCache(p.parent),
              teacherTone: p.parent?.teacherTone || 'balanced',
            },
            interests: {
              sports: Number(p.interests?.sports) || 0,
              art: Number(p.interests?.art) || 0,
              music: Number(p.interests?.music) || 0,
              coding: Number(p.interests?.coding) || 0,
              literature: Number(p.interests?.literature) || 0,
            },
          });
        } catch {
          set({ ...initial });
        }
      },
    }),
    {
      name: 'ai-one-person-school-v1',
      storage: createJSONStorage(() => accountStorage),
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<SchoolState>;
        const student = p.student
          ? {
              ...p.student,
              badges: Array.isArray(p.student.badges) ? p.student.badges : [],
              decorations: Array.isArray(p.student.decorations) ? p.student.decorations : [],
            }
          : current.student;
        return {
          ...current,
          ...p,
          student,
          ops: normalizeOps(p.ops, student?.points),
          assessments: p.assessments && typeof p.assessments === 'object' ? p.assessments : current.assessments,
          plans: p.plans && typeof p.plans === 'object' ? p.plans : current.plans,
          practices: Array.isArray(p.practices) ? p.practices : current.practices,
          wrongBook: Array.isArray(p.wrongBook) ? p.wrongBook : current.wrongBook,
          studyTimePlan: normalizeStudyTimePlan(p.studyTimePlan || current.studyTimePlan),
          daySchedule: normalizeDaySchedule(p.daySchedule || current.daySchedule || DEFAULT_DAY_SCHEDULE),
          freeLabUntil: p.freeLabUntil ?? current.freeLabUntil ?? null,
          labCompletedIds: Array.isArray(p.labCompletedIds)
            ? p.labCompletedIds
            : current.labCompletedIds || [],
          labMission: p.labMission ?? current.labMission ?? null,
          aiSkillLevel: p.aiSkillLevel ?? current.aiSkillLevel ?? null,
          // 旧存档无该字段视为已完成，避免老用户被强制拉回面谈
          principalIntakeDone: resolvePrincipalIntakeDone(
            p.principalIntakeDone,
            !!(student || current.student),
          ),
          principalIntake: p.principalIntake ?? current.principalIntake ?? null,
          iqeResult: p.iqeResult ?? current.iqeResult ?? null,
          editionPrefs: {
            ...DEFAULT_EDITION_PREFS,
            ...(current.editionPrefs || {}),
            ...(p.editionPrefs || {}),
          },
          parent: {
            ...current.parent,
            ...readOnlyGuardianCache(p.parent),
            teacherTone: p.parent?.teacherTone || current.parent?.teacherTone || 'balanced',
          },
          interests: {
            ...(current.interests || {}),
            ...(p.interests || {}),
            sports: Number(p.interests?.sports ?? current.interests?.sports) || 0,
            art: Number(p.interests?.art ?? current.interests?.art) || 0,
            music: Number(p.interests?.music ?? current.interests?.music) || 0,
            coding: Number(p.interests?.coding ?? current.interests?.coding) || 0,
            literature: Number(p.interests?.literature ?? current.interests?.literature) || 0,
          },
        };
      },
    },
  ),
);

function bandBadge(band: AgeBand) {
  if (band === 'low') return '低龄段';
  if (band === 'mid') return '高龄段';
  return '高中段';
}
