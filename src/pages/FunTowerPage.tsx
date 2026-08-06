import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, MarkdownLite, PrimaryButton, Shell } from '@/components/ui';
import { INTEREST_ROOMS } from '@/lib/knowledge';
import { schoolChat, withAgeBand } from '@/lib/llm';
import { useSchoolStore } from '@/store/school';

export default function FunTowerPage() {
  const student = useSchoolStore((s) => s.student)!;
  const unlocked = useSchoolStore((s) => s.funUnlockedToday);
  const unlockFun = useSchoolStore((s) => s.unlockFun);
  const interests = useSchoolStore((s) => s.interests);
  const bumpInterest = useSchoolStore((s) => s.bumpInterest);
  const [room, setRoom] = useState<(typeof INTEREST_ROOMS)[number] | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const explore = async (r: (typeof INTEREST_ROOMS)[number]) => {
    setRoom(r);
    setBusy(true);
    bumpInterest(r.key, 1);
    try {
      const text = await schoolChat({
        system: withAgeBand(
          `你是兴趣探索向导（非学科老师）。在「${r.name}」给孩子一个好玩的小探索：短知识+一个互动小问题。不要布置作业。`,
          student.ageBand,
        ),
        user: `兴趣室：${r.name}。孩子兴趣值 sports${interests.sports}/art${interests.art}/music${interests.music}/coding${interests.coding}`,
      });
      setReply(text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '探索失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="娱乐与自我探索楼">
      {!unlocked && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm">今日娱乐时间尚未解锁。完成任一学科「今日任务」即可解锁；也可临时开启体验。</p>
          <PrimaryButton className="mt-2" onClick={() => unlockFun()}>
            临时开启体验
          </PrimaryButton>
        </Card>
      )}
      <div className={`grid md:grid-cols-2 gap-3 ${!unlocked ? 'opacity-60 pointer-events-none' : ''}`}>
        {INTEREST_ROOMS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => explore(r)}
            className="rounded-3xl bg-white/90 shadow-soft p-4 text-left border border-white hover:-translate-y-0.5 transition"
          >
            <div className="text-4xl">{r.emoji}</div>
            <div className="font-bold mt-2">{r.name}</div>
            <div className="text-xs text-campus-ink/60">{r.blurb}</div>
            <div className="text-xs mt-2 text-campus-mint">兴趣值 {interests[r.key]}</div>
          </button>
        ))}
      </div>
      {room && (
        <Card className="mt-4">
          <div className="font-bold">
            {room.emoji} {room.name}
          </div>
          {busy ? (
            <div className="flex items-center gap-2 text-sm mt-3">
              <Loader2 className="w-4 h-4 animate-spin" /> 探索中…
            </div>
          ) : (
            <div className="mt-3 text-sm">
              <MarkdownLite text={reply} />
            </div>
          )}
        </Card>
      )}
    </Shell>
  );
}
