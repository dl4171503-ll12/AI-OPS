import { supabase } from './supabase';
import type { IqeResult, TextbookEditionPrefs } from './types';
import { DEFAULT_EDITION_PREFS } from './types';

export type CloudAccountRow = {
  id: string;
  phone: string | null;
  email: string | null;
  display_name: string;
  avatar: string;
  grade_year: number;
  edition_prefs: TextbookEditionPrefs;
  school_id: string | null;
  iqe_result: IqeResult | null;
  profile_json: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type AccountDraft = {
  displayName: string;
  avatar: string;
  gradeYear: number;
  editionPrefs?: Partial<TextbookEditionPrefs>;
};

const DRAFT_KEY = 'ai-school-account-draft';

export function saveAccountDraft(draft: AccountDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function loadAccountDraft(): AccountDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as AccountDraft;
    if (!p?.displayName || !p?.avatar) return null;
    return p;
  } catch {
    return null;
  }
}

export function clearAccountDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export async function getAuthUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** 将账号档案写入 Supabase（需已登录） */
export async function upsertSchoolAccount(input: {
  displayName: string;
  avatar: string;
  gradeYear: number;
  phone?: string | null;
  email?: string | null;
  editionPrefs?: Partial<TextbookEditionPrefs>;
  schoolId?: string | null;
  iqeResult?: IqeResult | null;
  profileJson?: Record<string, unknown> | null;
}): Promise<{ error: Error | null; row?: CloudAccountRow }> {
  const uid = await getAuthUserId();
  if (!uid) return { error: new Error('尚未登录，无法写入数据库') };

  const payload = {
    id: uid,
    phone: input.phone ?? null,
    email: input.email ?? null,
    display_name: input.displayName.trim(),
    avatar: input.avatar,
    grade_year: input.gradeYear,
    edition_prefs: { ...DEFAULT_EDITION_PREFS, ...(input.editionPrefs || {}) },
    school_id: input.schoolId ?? null,
    iqe_result: input.iqeResult ?? null,
    profile_json: input.profileJson ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('school_accounts')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    return {
      error: new Error(
        error.message.includes('school_accounts')
          ? '数据库表 school_accounts 未创建，请在 Supabase 执行 supabase/school_accounts.sql'
          : error.message,
      ),
    };
  }

  return { row: data as CloudAccountRow, error: null };
}

export async function fetchSchoolAccount(): Promise<{
  row: CloudAccountRow | null;
  error: Error | null;
}> {
  const uid = await getAuthUserId();
  if (!uid) return { row: null, error: null };
  const { data, error } = await supabase.from('school_accounts').select('*').eq('id', uid).maybeSingle();
  if (error) return { row: null, error: new Error(error.message) };
  return { row: (data as CloudAccountRow) || null, error: null };
}

export async function syncIqeToCloud(iqe: IqeResult): Promise<Error | null> {
  const uid = await getAuthUserId();
  if (!uid) return new Error('未登录');
  const { error } = await supabase
    .from('school_accounts')
    .update({ iqe_result: iqe, updated_at: new Date().toISOString() })
    .eq('id', uid);
  return error ? new Error(error.message) : null;
}
