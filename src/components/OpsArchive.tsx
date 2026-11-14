import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PrimaryButton } from './ui';
import { useSchoolStore } from '@/store/school';
import { localDate, reportMarkdown } from '@/lib/ops';

// 仅在当前页面会话中保存口令，不写 localStorage、不发给服务器。
let archivePassword = '';
let running = false;
let lastSaved = '';
const encoder = new TextEncoder();
function base64(bytes: Uint8Array) { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); }
async function archive() {
  const state = useSchoolStore.getState();
  if (!archivePassword || !state.student || running) return;
  running = true;
  try {
    const studentId = state.student.id;
    const date = localDate();
    const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12));
    const material = await crypto.subtle.importKey('raw', encoder.encode(archivePassword), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    // 白名单，不归档联系方式、家长口令、社交私信或函数。
    const data = { student: state.student, assessments: state.assessments, plans: state.plans, practices: state.practices, wrongBook: state.wrongBook, iqeResult: state.iqeResult, emotions: state.emotions, daySchedule: state.daySchedule, ops: state.ops };
    const payload = JSON.stringify({ version: 1, date, studentId, files: { 'learning.json': data, 'report.md': reportMarkdown(state) } });
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(payload));
    const response = await fetch('/api/ops-archive', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-OPS-Archive': '1' }, body: JSON.stringify({ studentId, date, envelope: { version: 1, algorithm: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations: 310000, salt: base64(salt), iv: base64(iv), ciphertext: base64(new Uint8Array(encrypted)) } }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || '归档失败');
    lastSaved = `${studentId}:${date}`;
    state.updateOps(o => ({ ...o, archivedAt: new Date().toISOString() }));
    return result.path as string;
  } finally { running = false; }
}
export function OpsArchiveAgent() {
  const studentId = useSchoolStore(s => s.student?.id);
  useEffect(() => {
    archivePassword = ''; lastSaved = '';
    const timer = window.setInterval(() => { if (archivePassword && lastSaved !== `${studentId}:${localDate()}`) void archive().catch(() => toast.error('自动归档未完成，请到家长与归档页重试')); }, 60_000);
    return () => { window.clearInterval(timer); archivePassword = ''; };
  }, [studentId]);
  return null;
}
export function OpsArchivePanel() {
  const archivedAt = useSchoolStore(s => s.ops.archivedAt);
  const [password, setPassword] = useState(''); const [enabled, setEnabled] = useState(Boolean(archivePassword));
  const [busy, setBusy] = useState(false); const [path, setPath] = useState('');
  return <section className="border-t pt-4"><h4 className="font-bold">D 盘加密归档</h4><p className="text-sm mt-2 leading-6">JSON 学习数据与 Markdown 报告封装后加密保存。页面保持打开并解锁期间每日自动导出，周日额外归档，每月最后一天生成快照。浏览器关闭期间不会执行。</p><p className="text-xs text-slate-500 my-3">归档口令只保留在本次会话，服务器只收到密文。请妥善记住口令，丢失后无法解密。现有浏览器学习缓存仍是本地明文，不等同于加密档案。</p><label className="block text-sm">归档口令（至少 12 位）<input className="block w-full max-w-lg rounded-xl border p-3 my-2" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label><div className="flex gap-3 flex-wrap"><PrimaryButton disabled={busy || (!enabled && password.length < 12)} onClick={async () => { setBusy(true); try { if (password.length >= 12) archivePassword = password; const savedPath = await archive(); if (savedPath) { setPath(savedPath); setEnabled(true); setPassword(''); toast.success('密文档案已写入 D 盘'); } } catch (e) { toast.error(e instanceof Error ? e.message : '归档失败'); } finally { setBusy(false); } }}>{busy ? '正在加密归档…' : enabled ? '立即更新归档' : '启用并立即归档'}</PrimaryButton>{enabled && <button className="text-sm underline" onClick={() => { archivePassword = ''; setEnabled(false); }}>锁定并停止自动归档</button>}</div><p className="text-xs text-slate-500 mt-3 break-all">{path || '目录：工作区 .ops-data / 学生ID / 日期 / 类型'}</p><p className="text-xs mt-2">最近成功归档：{archivedAt ? new Date(archivedAt).toLocaleString() : '尚未归档'}</p></section>;
}
