import type { SubjectId } from './types';
import { getGuestTrialStartedAt, getStoredContact, getStoredPhone, isGuestTrialActive, isLoggedIn } from './phone-auth';

export const TRIAL_SUBJECTS: SubjectId[] = ['math', 'chinese', 'english'];

export type AccessSnapshot = {
  loggedIn: boolean;
  phone: string | null;
  guest: boolean;
  trialActive: boolean;
  trialExpired: boolean;
};

export function getAccessSnapshot(): AccessSnapshot {
  const contact = getStoredContact();
  const phone = getStoredPhone() || (contact?.kind === 'phone' ? contact.value : null);
  const loggedIn = Boolean(contact);
  if (loggedIn) {
    return { loggedIn: true, phone, guest: false, trialActive: false, trialExpired: false };
  }
  const trialStarted = getGuestTrialStartedAt();
  if (!trialStarted) {
    return { loggedIn: false, phone: null, guest: true, trialActive: true, trialExpired: false };
  }
  const active = isGuestTrialActive(trialStarted);
  return {
    loggedIn: false,
    phone: null,
    guest: true,
    trialActive: active,
    trialExpired: !active,
  };
}

/** 未登录且从未开始试用：允许先进入引导并启动试用 */
export function canEnterAsGuest(): boolean {
  const s = getAccessSnapshot();
  if (s.loggedIn) return true;
  if (!getGuestTrialStartedAt()) return true;
  return isGuestTrialActive();
}

export function canAccessSubject(subject: SubjectId | string | undefined): boolean {
  const s = getAccessSnapshot();
  if (s.loggedIn) return true;
  if (s.trialExpired) return false;
  return TRIAL_SUBJECTS.includes(subject as SubjectId);
}

/** 副科 / 社交 / 家长中心 / 兴趣楼：需登录 */
export function canAccessFullCampus(): boolean {
  return isLoggedIn();
}

export function canAccessParentCenter(): boolean {
  return isLoggedIn();
}

export function canAccessSocial(): boolean {
  return isLoggedIn();
}

export function canAccessMinorSubjects(): boolean {
  return isLoggedIn();
}

export function canAccessFunTower(): boolean {
  return isLoggedIn();
}

/**
 * 试用期老师功能受限：不可生成试卷、不可搜最新资料；辅导对话有次数上限。
 */
export function canUseFullTeacherTools(): boolean {
  return isLoggedIn();
}

const GUEST_TUTOR_KEY = 'ai-school-guest-tutor-count';

export function getGuestTutorCount(): number {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(GUEST_TUTOR_KEY);
    if (!raw) return 0;
    const j = JSON.parse(raw) as { day?: string; n?: number };
    if (j.day !== day) return 0;
    return Number(j.n) || 0;
  } catch {
    return 0;
  }
}

export function bumpGuestTutorCount(): number {
  const n = getGuestTutorCount() + 1;
  try {
    localStorage.setItem(
      GUEST_TUTOR_KEY,
      JSON.stringify({ day: new Date().toISOString().slice(0, 10), n }),
    );
  } catch {
    /* ignore */
  }
  return n;
}

export const GUEST_TUTOR_LIMIT = 5;

export function canGuestAskTutor(): boolean {
  if (isLoggedIn()) return true;
  if (!isGuestTrialActive() && getGuestTrialStartedAt()) return false;
  return getGuestTutorCount() < GUEST_TUTOR_LIMIT;
}

export function accessBlockMessage(kind: 'subject' | 'full' | 'teacher' | 'trial'): string {
  if (kind === 'trial') return '免费试用已结束，请使用手机号登录以保留学习记忆并解锁全部功能。';
  if (kind === 'subject') return '试用仅开放语文、数学、英语。登录后可使用副科与全部功能。';
  if (kind === 'teacher') return '试用期老师功能受限。登录后可使用出卷、最新资料与完整辅导。';
  return '交友、副科等需登录同一手机号后使用，学习记忆将长期保留。';
}
