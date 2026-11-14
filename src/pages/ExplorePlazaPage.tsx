import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Card, MarkdownLite, PrimaryButton, Shell } from '@/components/ui';
import { SpeakableBlock } from '@/components/ReadAloudButton';
import { ReadAloudControls } from '@/components/ReadAloudControls';
import { schoolChat, withAgeBand } from '@/lib/llm';
import { speakGuideAloud } from '@/lib/read-aloud';
import { useSchoolStore } from '@/store/school';
import { SCENES } from '@/lib/scenes';

const EGGS = [
  '校园角落的银杏叶可以做成书签哦。',
  '蚂蚁搬家其实是在用化学气味通信。',
  '月亮不会发光，它只是反射太阳光。',
  '彩虹其实是一个完整的圆，地面挡住了下半部分。',
];

export default function ExplorePlazaPage() {
  const student = useSchoolStore((s) => s.student)!;
  const teacherTone = useSchoolStore((s) => s.parent?.teacherTone || 'balanced');
  const interests = useSchoolStore((s) => s.interests);
  const notes = useSchoolStore((s) => s.exploreNotes);
  const addExploreNote = useSchoolStore((s) => s.addExploreNote);
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    const q = input.trim();
    if (!q) return;
    setBusy(true);
    try {
      const text = await schoolChat({
        system: withAgeBand(
          '你是开放探索广场的好奇向导（十万个为什么模式）。根据孩子兴趣画像推荐延伸点，回答有趣、准确、适龄。先激发好奇再给清晰解释。',
          student.ageBand,
          teacherTone,
          { role: 'teacher', student },
        ),
        user: `兴趣画像 sports${interests.sports}/art${interests.art}/music${interests.music}/coding${interests.coding}/literature${interests.literature || 0}。问题：${q}`,
      });
      setReply(text);
      addExploreNote(q);
      setInput('');
      void speakGuideAloud(text, student.grade).catch(() => undefined);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '广场信号不稳');
    } finally {
      setBusy(false);
    }
  };

  const egg = () => {
    const tip = EGGS[Math.floor(Math.random() * EGGS.length)];
    const text = `彩蛋：${tip}`;
    setReply(text);
    addExploreNote(`彩蛋·${tip}`);
    void speakGuideAloud(text, student.grade).catch(() => undefined);
  };

  return (
    <Shell title="开放式探索广场" sceneSrc={SCENES.explore}>
      <Card className="mb-4 bg-sky-50/80">
        <div className="font-display text-2xl">随便逛逛</div>
        <p className="text-sm text-campus-ink/70 mt-1">问任何为什么都可以。向导回复后会自动亲切朗读。</p>
        <ReadAloudControls className="mt-2" />
        <PrimaryButton className="mt-3" onClick={egg}>
          随机发现彩蛋
        </PrimaryButton>
      </Card>
      <Card>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void ask()}
            className="flex-1 rounded-2xl border px-3 py-2"
            placeholder="为什么天空是蓝的？"
          />
          <PrimaryButton disabled={busy} onClick={() => void ask()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </PrimaryButton>
        </div>
        {reply && (
          <div className="mt-4 text-sm rounded-2xl bg-campus-cream/70 p-3">
            <SpeakableBlock text={reply} kind="general">
              <MarkdownLite text={reply} />
            </SpeakableBlock>
          </div>
        )}
        {notes.length > 0 && (
          <div className="mt-4 text-xs text-campus-ink/50">最近探索：{notes.slice(0, 5).join(' · ')}</div>
        )}
      </Card>
    </Shell>
  );
}
