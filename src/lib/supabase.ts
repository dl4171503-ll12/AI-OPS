import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  console.warn('[ai-school] 缺少 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，手机登录不可用');
}

export const supabase = createClient(url || 'http://localhost', anon || 'anon', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'ai-school-supabase-auth',
  },
});
