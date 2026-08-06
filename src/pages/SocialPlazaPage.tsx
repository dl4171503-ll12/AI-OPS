import { useState } from 'react';
import { toast } from 'sonner';
import { Card, PrimaryButton, Shell } from '@/components/ui';
import { moderateSocialText } from '@/lib/moderation';
import { useSchoolStore } from '@/store/school';

export default function SocialPlazaPage() {
  const student = useSchoolStore((s) => s.student)!;
  const friends = useSchoolStore((s) => s.friends);
  const inbox = useSchoolStore((s) => s.socialInbox);
  const parent = useSchoolStore((s) => s.parent);
  const addFriend = useSchoolStore((s) => s.addFriend);
  const addSocial = useSchoolStore((s) => s.addSocial);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [to, setTo] = useState('');

  const addByCode = () => {
    if (!parent.allowSocial) {
      toast.error('家长已关闭社交功能');
      return;
    }
    const c = code.trim().toUpperCase();
    if (c.length < 4) {
      toast.error('请输入有效邀请码');
      return;
    }
    addFriend({
      id: `f-${c}`,
      name: `同学-${c.slice(0, 3)}`,
      schoolId: `SCH-${c}`,
      avatar: '🧒',
    });
    setCode('');
    toast.success('已添加好友学校');
  };

  const send = () => {
    if (!parent.allowSocial) {
      toast.error('家长已关闭社交功能');
      return;
    }
    const target = to || friends[0]?.schoolId;
    if (!target) {
      toast.error('请先添加好友');
      return;
    }
    const mod = moderateSocialText(msg, student.ageBand);
    if (mod.risk === 'low' && !mod.blocked) toast.message(mod.note || '请友善交流');
    if (mod.blocked) {
      addSocial({
        from: student.schoolId,
        to: target,
        content: mod.cleaned,
        blocked: true,
        risk: mod.risk,
        note: mod.note,
      });
      toast.error(mod.note || '消息已拦截');
      setMsg('');
      return;
    }
    addSocial({
      from: student.schoolId,
      to: target,
      content: mod.cleaned,
      blocked: false,
      risk: 'none',
    });
    // 模拟好友回礼贴纸
    addSocial({
      from: target,
      to: student.schoolId,
      content: '送你一枚贴纸 🌟（学习加油）',
      blocked: false,
      risk: 'none',
    });
    setMsg('');
    toast.success('已发送，并收到回礼贴纸');
  };

  return (
    <Shell title="校际社交广场">
      <Card className="mb-4">
        <div className="font-bold">我的邀请码：{student.inviteCode}</div>
        <p className="text-xs text-campus-ink/60 mt-1">所有消息经过儿童安全审核。禁止泄露个人信息。</p>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 rounded-xl border px-3 py-2"
            placeholder="输入好友邀请码"
          />
          <PrimaryButton onClick={addByCode}>加好友</PrimaryButton>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <div className="font-bold mb-2">好友学校</div>
          {friends.length === 0 ? (
            <p className="text-sm text-campus-ink/60">还没有好友，去串门前先加一位吧。</p>
          ) : (
            <ul className="space-y-2">
              {friends.map((f) => (
                <li key={f.id} className="flex items-center gap-2 rounded-xl bg-campus-cream/70 px-3 py-2">
                  <span className="text-2xl">{f.avatar}</span>
                  <div>
                    <div className="font-bold text-sm">{f.name}</div>
                    <div className="text-xs text-campus-ink/60">{f.schoolId}</div>
                  </div>
                  <button type="button" className="ml-auto text-xs text-campus-mint font-bold" onClick={() => setTo(f.schoolId)}>
                    选中聊天
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <div className="font-bold mb-2">温和聊天 / 互赠贴纸</div>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 min-h-[100px]"
            placeholder="分享学习心得或鼓励对方（不要留手机号/微信）"
          />
          <PrimaryButton className="mt-2" onClick={send}>
            发送
          </PrimaryButton>
          <div className="mt-4 space-y-2 max-h-56 overflow-y-auto">
            {inbox.slice(0, 20).map((m) => (
              <div
                key={m.id}
                className={`text-xs rounded-xl px-3 py-2 ${m.blocked ? 'bg-red-50 text-red-700' : 'bg-white border'}`}
              >
                <div className="opacity-60">
                  {m.from} → {m.to}
                </div>
                <div>{m.blocked ? `【已拦截】${m.note}` : m.content}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
