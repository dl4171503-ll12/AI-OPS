import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, PrimaryButton, Shell } from '@/components/ui';
import { DECOR_SHOP } from '@/lib/knowledge';
import { SUBJECTS } from '@/lib/types';
import { useSchoolStore } from '@/store/school';

export default function ParentCenterPage() {
  const student = useSchoolStore((s) => s.student)!;
  const assessments = useSchoolStore((s) => s.assessments);
  const wrongBook = useSchoolStore((s) => s.wrongBook);
  const practices = useSchoolStore((s) => s.practices);
  const emotions = useSchoolStore((s) => s.emotions);
  const inbox = useSchoolStore((s) => s.socialInbox);
  const parent = useSchoolStore((s) => s.parent);
  const setParent = useSchoolStore((s) => s.setParent);
  const unlockDecoration = useSchoolStore((s) => s.unlockDecoration);
  const [pinOk, setPinOk] = useState(false);
  const [pin, setPin] = useState('');
  const [encourage, setEncourage] = useState(parent.encourageMsg || '');

  const radar = useMemo(
    () =>
      (['math', 'chinese', 'english'] as const).map((id) => ({
        id,
        name: SUBJECTS.find((s) => s.id === id)?.name || id,
        score: assessments[id]?.score ?? 0,
      })),
    [assessments],
  );

  if (!pinOk) {
    return (
      <Shell title="家长中心">
        <Card className="max-w-md mx-auto">
          <h2 className="font-display text-2xl">家长验证</h2>
          <p className="text-sm text-campus-ink/65 mt-1">默认 PIN：1234（可在进入后修改）</p>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mt-4 w-full rounded-xl border px-3 py-2"
            placeholder="输入 PIN"
          />
          <PrimaryButton
            className="mt-3 w-full"
            onClick={() => {
              if (pin === parent.pin) {
                setPinOk(true);
              } else toast.error('PIN 不正确');
            }}
          >
            进入家长中心
          </PrimaryButton>
        </Card>
      </Shell>
    );
  }

  const socialRisks = inbox.filter((m) => m.blocked || (m.risk && m.risk !== 'none'));

  return (
    <Shell title="家长中心">
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <div className="font-bold">学情总览</div>
          {radar.map((r) => (
            <div key={r.id} className="mt-2">
              <div className="flex justify-between text-xs">
                <span>{r.name}</span>
                <span>{r.score || '未测'}</span>
              </div>
              <div className="h-2 rounded-full bg-campus-ink/10 overflow-hidden">
                <div className="h-full bg-campus-brick" style={{ width: `${r.score}%` }} />
              </div>
            </div>
          ))}
          <div className="text-xs mt-3 text-campus-ink/65">
            练习 {practices.length} 次 · 错题 {wrongBook.length} · 积分 {student.points}
          </div>
        </Card>

        <Card>
          <div className="font-bold">心理状态摘要</div>
          <p className="text-xs text-campus-ink/60 mt-1">不展示完整聊天，仅情绪趋势</p>
          <ul className="mt-2 space-y-2 text-sm">
            {emotions.slice(0, 6).map((e) => (
              <li key={e.id} className="rounded-xl bg-emerald-50 px-3 py-2">
                <span className="font-bold">{e.mood}</span> · {e.summary}
                {e.risk && e.risk !== 'none' ? `（风险:${e.risk}）` : ''}
              </li>
            ))}
            {emotions.length === 0 && <li className="text-sm text-campus-ink/60">暂无谈心记录</li>}
          </ul>
        </Card>

        <Card>
          <div className="font-bold">错题本（只读）</div>
          <ul className="mt-2 space-y-2 max-h-56 overflow-y-auto text-sm">
            {wrongBook.slice(0, 20).map((w) => (
              <li key={w.id} className="border rounded-xl p-2">
                [{w.subject}] {w.question}
              </li>
            ))}
            {wrongBook.length === 0 && <li className="text-campus-ink/60">暂无错题</li>}
          </ul>
        </Card>

        <Card>
          <div className="font-bold">社交安全面板</div>
          <label className="flex items-center gap-2 text-sm mt-2">
            <input
              type="checkbox"
              checked={parent.allowSocial}
              onChange={(e) => setParent({ allowSocial: e.target.checked })}
            />
            允许校际社交
          </label>
          <label className="block text-sm mt-2">
            低龄聊天可见性
            <select
              className="ml-2 border rounded-lg px-2 py-1"
              value={parent.socialView}
              onChange={(e) => setParent({ socialView: e.target.value as 'full' | 'summary' })}
            >
              <option value="full">全部内容（建议低龄）</option>
              <option value="summary">仅风险摘要</option>
            </select>
          </label>
          <div className="mt-3 text-sm max-h-40 overflow-y-auto space-y-1">
            {(parent.socialView === 'full' ? inbox : socialRisks).slice(0, 15).map((m) => (
              <div key={m.id} className="text-xs rounded-lg bg-campus-cream px-2 py-1">
                {m.blocked ? `拦截：${m.note}` : m.content}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="font-bold">给孩子发鼓励</div>
          <textarea
            value={encourage}
            onChange={(e) => setEncourage(e.target.value)}
            className="mt-2 w-full border rounded-xl px-3 py-2 min-h-[80px]"
            placeholder="今晚继续加油！"
          />
          <PrimaryButton
            className="mt-2"
            onClick={() => {
              setParent({ encourageMsg: encourage });
              toast.success('鼓励消息已送达（学生端设置页可见）');
            }}
          >
            发送鼓励
          </PrimaryButton>
        </Card>

        <Card>
          <div className="font-bold">成长里程碑 / 装饰兑换（代操作）</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {student.badges.map((b) => (
              <span key={b} className="text-xs bg-campus-sun/40 rounded-full px-2 py-1 font-bold">
                {b}
              </span>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DECOR_SHOP.map((d) => (
              <button
                key={d.id}
                type="button"
                className="rounded-xl border px-2 py-2 text-sm"
                onClick={() => {
                  unlockDecoration(d.id);
                  toast.message(student.points >= 30 ? `尝试兑换 ${d.id}` : '积分不足');
                }}
              >
                {d.emoji} {d.id} · {d.cost}分
              </button>
            ))}
          </div>
          <label className="block text-sm mt-4">
            修改 PIN
            <input
              className="ml-2 border rounded-lg px-2 py-1"
              defaultValue={parent.pin}
              onBlur={(e) => setParent({ pin: e.target.value || '1234' })}
            />
          </label>
        </Card>
      </div>
    </Shell>
  );
}
