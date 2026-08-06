import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AgeBand,
  AssessmentResult,
  ChatMessage,
  DailyPlan,
  EmotionLog,
  Friend,
  GradeKey,
  InterestProfile,
  PracticeRecord,
  SchoolState,
  SocialMessage,
  StudentProfile,
  SubjectId,
  WrongItem,
} from '@/lib/types';
import { gradeToBand } from '@/lib/types';

function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function schoolId() {
  return `SCH-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString().slice(-4)}`;
}

function inviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const initial: SchoolState = {
  student: null,
  assessments: {},
  plans: {},
  wrongBook: [],
  practices: [],
  principalChat: [],
  counselorChat: [],
  emotions: [],
  interests: { sports: 0, art: 0, music: 0, coding: 0 },
  friends: [],
  socialInbox: [],
  exploreNotes: [],
  parent: { pin: '1234', socialView: 'full', allowSocial: true },
  funUnlockedToday: false,
  promotionReady: false,
  showPromotion: false,
};

type Actions = {
  createSchool: (opts: { name: string; avatar: string; grade: GradeKey }) => void;
  bumpStudyDay: () => void;
  setAssessment: (a: AssessmentResult) => void;
  setPlan: (p: DailyPlan) => void;
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
  setMorningBrief: (content: string) => void;
  unlockFun: () => void;
  checkPromotion: () => void;
  completePromotion: () => void;
  dismissPromotion: () => void;
  addPoints: (n: number) => void;
  unlockDecoration: (id: string) => void;
  earnBadge: (badge: string) => void;
  resetAll: () => void;
};

export const useSchoolStore = create<SchoolState & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      createSchool: ({ name, avatar, grade }) => {
        const student: StudentProfile = {
          id: uid('stu'),
          name: name.trim() || '小朋友',
          avatar,
          grade,
          ageBand: gradeToBand(grade),
          schoolId: schoolId(),
          inviteCode: inviteCode(),
          createdAt: new Date().toISOString(),
          studyDays: 1,
          lastStudyDate: new Date().toISOString().slice(0, 10),
          points: 20,
          badges: ['入学徽章'],
          decorations: ['小树苗'],
        };
        set({ ...initial, student });
      },
      bumpStudyDay: () => {
        const s = get().student;
        if (!s) return;
        const today = new Date().toISOString().slice(0, 10);
        if (s.lastStudyDate === today) return;
        set({
          student: { ...s, studyDays: s.studyDays + 1, lastStudyDate: today },
          funUnlockedToday: false,
        });
      },
      setAssessment: (a) => set({ assessments: { ...get().assessments, [a.subject]: a } }),
      setPlan: (p) => set({ plans: { ...get().plans, [p.subject]: p } }),
      toggleTask: (subject, taskId) => {
        const plan = get().plans[subject];
        if (!plan) return;
        const tasks = plan.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
        const next = { ...plan, tasks };
        set({ plans: { ...get().plans, [subject]: next } });
        if (tasks.every((t) => t.done)) {
          get().unlockFun();
          get().earnBadge(`${subject}-今日通关`);
          get().addPoints(15);
        }
        get().checkPromotion();
      },
      addPractice: (p) => {
        const rec: PracticeRecord = { ...p, id: uid('pr'), createdAt: new Date().toISOString() };
        const practices = [rec, ...get().practices].slice(0, 200);
        let wrongBook = get().wrongBook;
        if (!p.correct) {
          const w: WrongItem = {
            id: uid('w'),
            subject: p.subject,
            knowledge: p.knowledge,
            question: p.question,
            userAnswer: p.userAnswer,
            correctAnswer: '',
            explanation: p.explanation,
            createdAt: rec.createdAt,
          };
          wrongBook = [w, ...wrongBook].slice(0, 200);
        }
        set({ practices, wrongBook });
        get().addPoints(p.correct ? 5 : 1);
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
        const interests = { ...get().interests, [key]: get().interests[key] + n };
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
      setMorningBrief: (content) =>
        set({ morningBrief: { date: new Date().toISOString().slice(0, 10), content } }),
      unlockFun: () => set({ funUnlockedToday: true }),
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
            points: s.points + 100,
            promotedFrom: s.ageBand,
          },
          promotionReady: false,
          showPromotion: true,
        });
      },
      dismissPromotion: () => set({ showPromotion: false }),
      addPoints: (n) => {
        const s = get().student;
        if (!s) return;
        set({ student: { ...s, points: s.points + n } });
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
    }),
    { name: 'ai-one-person-school-v1' },
  ),
);

function bandBadge(band: AgeBand) {
  if (band === 'low') return '低龄段';
  if (band === 'mid') return '高龄段';
  return '高中段';
}
