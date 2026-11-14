/** 浏览器通知：申请权限 + 按时段练习提醒 */
const SCHEDULE = [
  { start: 7, end: 9, title: '晨读时间', body: '英语或语文轻量练习 10 分钟，开启活力一天～', subject: 'english' },
  { start: 9, end: 12, title: '上午主课', body: '适合做数学测评/今日任务，认真攻克薄弱点。', subject: 'math' },
  { start: 14, end: 17, title: '下午巩固', body: '语文阅读或错题重练，把上午知识钉牢。', subject: 'chinese' },
  { start: 19, end: 21, title: '晚间复盘', body: '看看学习报告，找校长聊聊明日计划吧。', subject: 'math' },
] as const;

export type ReminderSlot = (typeof SCHEDULE)[number];

export function currentReminder(now = new Date()): ReminderSlot | null {
  const h = now.getHours();
  return SCHEDULE.find((s) => h >= s.start && h < s.end) || null;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function showPracticeNotification(slot?: ReminderSlot | null) {
  const s = slot ?? currentReminder();
  if (!s) return false;
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    const n = new Notification(`AI一人学校 · ${s.title}`, {
      body: s.body,
      tag: `school-practice-${s.start}`,
      silent: false,
    } as NotificationOptions);
    n.onclick = () => {
      window.focus();
      window.location.href = `/hall/${s.subject}`;
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}

/** 启动周期提醒：进入校园后每 15 分钟检查一次；同槽位每天最多提醒一次 */
export function startPracticeReminderLoop() {
  if (typeof window === 'undefined') return () => undefined;
  const tick = async () => {
    const slot = currentReminder();
    if (!slot) return;
    const day = new Date().toISOString().slice(0, 10);
    const key = `school-remind-${day}-${slot.start}`;
    if (localStorage.getItem(key) === '1') return;
    if (Notification.permission !== 'granted') return;
    if (showPracticeNotification(slot)) localStorage.setItem(key, '1');
  };

  void tick();
  const id = window.setInterval(tick, 15 * 60 * 1000);
  return () => window.clearInterval(id);
}
