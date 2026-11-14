import { supabase } from './supabase';

const AUTH_PHONE_KEY = 'ai-school-auth-phone';
const AUTH_EMAIL_KEY = 'ai-school-auth-email';
const AUTH_CONTACT_KEY = 'ai-school-auth-contact'; // phone:11digits | email:xxx
const GUEST_TRIAL_KEY = 'ai-school-guest-trial-started';
const VERIFY_TIMEOUT_MS = 25_000;

const BACKEND_PAUSED_HINT =
  '秒哒后端刚恢复或仍在启动中。请稍后重试；若仍失败，请到秒哒「应用编辑页」确认后端已激活。';

export function normalizeAuthError(raw: unknown): Error {
  const msg = raw instanceof Error ? raw.message : String(raw || '请求失败');
  if (/长期未使用|已暂停|手动激活|backend.*(suspend|paused)|service.*unavailable/i.test(msg)) {
    return new Error(BACKEND_PAUSED_HINT);
  }
  if (/Failed to fetch|NetworkError|fetch failed|ERR_CONNECTION/i.test(msg)) {
    return new Error(`网络异常：${BACKEND_PAUSED_HINT}`);
  }
  return raw instanceof Error ? raw : new Error(msg);
}

export async function probeAuthBackend(): Promise<{ ok: boolean; detail: string }> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    return { ok: false, detail: '缺少 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY' };
  }
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const text = await res.text();
    if (!res.ok) {
      if (/长期未使用|已暂停|手动激活/.test(text)) {
        return { ok: false, detail: BACKEND_PAUSED_HINT };
      }
      return { ok: false, detail: `认证服务异常 (${res.status})` };
    }
    return { ok: true, detail: '认证服务正常' };
  } catch (e) {
    return { ok: false, detail: normalizeAuthError(e).message };
  }
}

export function getStoredPhone(): string | null {
  try {
    const p = localStorage.getItem(AUTH_PHONE_KEY);
    return p && /^1\d{10}$/.test(p) ? p : null;
  } catch {
    return null;
  }
}

export function setStoredPhone(phone: string | null) {
  try {
    if (phone) localStorage.setItem(AUTH_PHONE_KEY, phone);
    else localStorage.removeItem(AUTH_PHONE_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredEmail(): string | null {
  try {
    const e = localStorage.getItem(AUTH_EMAIL_KEY);
    return e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
  } catch {
    return null;
  }
}

export function setStoredEmail(email: string | null) {
  try {
    if (email) localStorage.setItem(AUTH_EMAIL_KEY, email.trim().toLowerCase());
    else localStorage.removeItem(AUTH_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}

/** 已绑定联系方式（手机或邮箱） */
export function getStoredContact(): { kind: 'phone' | 'email'; value: string } | null {
  const phone = getStoredPhone();
  if (phone) return { kind: 'phone', value: phone };
  const email = getStoredEmail();
  if (email) return { kind: 'email', value: email };
  try {
    const raw = localStorage.getItem(AUTH_CONTACT_KEY);
    if (!raw) return null;
    if (raw.startsWith('phone:')) {
      const v = raw.slice(6);
      return /^1\d{10}$/.test(v) ? { kind: 'phone', value: v } : null;
    }
    if (raw.startsWith('email:')) {
      const v = raw.slice(6);
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? { kind: 'email', value: v } : null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function markContact(kind: 'phone' | 'email', value: string) {
  try {
    localStorage.setItem(AUTH_CONTACT_KEY, `${kind}:${value}`);
  } catch {
    /* ignore */
  }
  if (kind === 'phone') {
    setStoredPhone(value);
    setStoredEmail(null);
  } else {
    setStoredEmail(value);
  }
}

export function getGuestTrialStartedAt(): string | null {
  try {
    return localStorage.getItem(GUEST_TRIAL_KEY);
  } catch {
    return null;
  }
}

export function startGuestTrial(): string {
  const iso = new Date().toISOString();
  try {
    if (!localStorage.getItem(GUEST_TRIAL_KEY)) {
      localStorage.setItem(GUEST_TRIAL_KEY, iso);
    }
    return localStorage.getItem(GUEST_TRIAL_KEY) || iso;
  } catch {
    return iso;
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getStoredContact());
}

export function isGuestTrialActive(startedAt?: string | null): boolean {
  const start = startedAt || getGuestTrialStartedAt();
  if (!start) return false;
  const t = Date.parse(start);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < 24 * 60 * 60 * 1000;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        window.clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export async function sendPhoneOtp(phone11: string): Promise<{ error: Error | null }> {
  const phone = phone11.replace(/\D/g, '');
  if (!/^1\d{10}$/.test(phone)) {
    return { error: new Error('请输入正确的11位手机号') };
  }
  try {
    const probe = await probeAuthBackend();
    if (!probe.ok) return { error: new Error(probe.detail) };
    const { error } = await supabase.auth.signInWithOtp({ phone: `+86${phone}` });
    if (error) throw error;
    return { error: null };
  } catch (e) {
    return { error: normalizeAuthError(e) };
  }
}

export async function verifyPhoneOtp(
  phone11: string,
  token: string,
): Promise<{ error: Error | null; phone?: string }> {
  const phone = phone11.replace(/\D/g, '');
  const code = String(token || '').trim();
  if (!/^1\d{10}$/.test(phone)) return { error: new Error('手机号无效') };
  if (code.length < 4) return { error: new Error('请输入验证码') };
  try {
    const { data, error } = await withTimeout(
      supabase.auth.verifyOtp({ phone: `+86${phone}`, token: code, type: 'sms' }),
      VERIFY_TIMEOUT_MS,
      '登录验证超时，请检查网络后重试',
    );
    if (error) throw error;
    if (!data.session) throw new Error('验证成功但未获得会话');
    markContact('phone', phone);
    return { error: null, phone };
  } catch (e) {
    return { error: normalizeAuthError(e) };
  }
}

export async function sendEmailOtp(emailRaw: string): Promise<{ error: Error | null }> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: new Error('请输入正确的邮箱') };
  }
  try {
    const probe = await probeAuthBackend();
    if (!probe.ok) return { error: new Error(probe.detail) };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
    return { error: null };
  } catch (e) {
    return { error: normalizeAuthError(e) };
  }
}

export async function verifyEmailOtp(
  emailRaw: string,
  token: string,
): Promise<{ error: Error | null; email?: string }> {
  const email = emailRaw.trim().toLowerCase();
  const code = String(token || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: new Error('邮箱无效') };
  if (code.length < 4) return { error: new Error('请输入验证码') };
  try {
    const { data, error } = await withTimeout(
      supabase.auth.verifyOtp({ email, token: code, type: 'email' }),
      VERIFY_TIMEOUT_MS,
      '登录验证超时，请检查网络后重试',
    );
    if (error) throw error;
    if (!data.session) throw new Error('验证成功但未获得会话');
    markContact('email', email);
    return { error: null, email };
  } catch (e) {
    return { error: normalizeAuthError(e) };
  }
}

export async function signOutSchool(): Promise<void> {
  setStoredPhone(null);
  setStoredEmail(null);
  try {
    localStorage.removeItem(AUTH_CONTACT_KEY);
  } catch {
    /* ignore */
  }
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
}

/** 启动时恢复会话（手机或邮箱） */
export async function hydrateAuthFromSession(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return getStoredContact()?.value ?? null;

    const rawPhone = user.phone || '';
    const digits = rawPhone.replace(/\D/g, '');
    const phone11 = digits.startsWith('86') && digits.length >= 13 ? digits.slice(-11) : digits;
    if (/^1\d{10}$/.test(phone11)) {
      markContact('phone', phone11);
      return phone11;
    }
    const email = (user.email || '').trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      markContact('email', email);
      return email;
    }
  } catch {
    /* ignore */
  }
  return getStoredContact()?.value ?? getStoredPhone();
}
