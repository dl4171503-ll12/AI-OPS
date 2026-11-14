import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Card, MarkdownLite, PrimaryButton, Shell } from '@/components/ui';
import { SpeakableBlock } from '@/components/ReadAloudButton';
import { ReadAloudControls } from '@/components/ReadAloudControls';
import { schoolChat, withAgeBand } from '@/lib/llm';
import { speakCounselorAloud } from '@/lib/read-aloud';
import { useSchoolStore } from '@/store/school';
import { SCENES } from '@/lib/scenes';

export default function CounselorPage() {
  const student = useSchoolStore((s) => s.student)!;
  const teacherTone = useSchoolStore((s) => s.parent?.teacherTone || 'balanced');
  const chat = useSchoolStore((s) => s.counselorChat);
  const pushChat = useSchoolStore((s) => s.pushChat);
  const addEmotion = useSchoolStore((s) => s.addEmotion);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    const trimmed = input.trim();
    if (!trimmed || busy) return;
    pushChat('counselor', { role: 'user', content: trimmed });
    setInput('');
    setBusy(true);
    try {
      const style =
        student.ageBand === 'low'
          ? '多用故事和拟人化比喻，温柔短句。'
          : student.ageBand === 'mid'
            ? '平等对话，帮助认知调整，少说教。'
            : '简洁、尊重、聚焦可执行的小步骤。';
      const reply = await schoolChat({
        system: withAgeBand(
          `你是心理老师，像知心大哥哥/大姐姐。${style}先倾听感受，再温和引导；不要一上来就下定论。不诊断疾病，遇危机建议告诉家长/老师。回复末尾用一行 JSON：{"mood":"开心|平静|焦虑|难过|愤怒|疲惫","risk":"none|low|mid|high","summary":"给家长的一句话摘要"}`,
          student.ageBand,
          teacherTone,
          { role: 'teacher', student },
        ),
        history: chat.slice(-8).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        user: trimmed,
      });
      const moodMatch = reply.match(/\{[\s\S]*"mood"[\s\S]*\}/);
      let visible = reply;
      if (moodMatch) {
        visible = reply.replace(moodMatch[0], '').trim();
        try {
          const meta = JSON.parse(moodMatch[0]) as {
            mood?: string;
            risk?: 'none' | 'low' | 'mid' | 'high';
            summary?: string;
          };
          addEmotion({
            mood: meta.mood || '平静',
            summary: meta.summary || '一次谈心',
            risk: meta.risk || 'none',
          });
        } catch {
          addEmotion({ mood: '平静', summary: '一次谈心', risk: 'none' });
        }
      } else {
        addEmotion({ mood: '平静', summary: '一次谈心', risk: 'none' });
      }
      const spoken = visible || reply;
      pushChat('counselor', { role: 'assistant', content: spoken });
      void speakCounselorAloud(spoken, student.grade).catch(() => undefined);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '心理老师暂时不在');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="心理咨询室" sceneSrc={SCENES.counselor}>
      <Card className="mb-4 bg-emerald-50/80">
        <div className="flex gap-3 items-center">
          <div className="text-5xl">💚</div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-2xl">温暖的谈心室</div>
            <p className="text-sm text-campus-ink/70">
              学习、生活、人际都可以说。老师回复后会自动用亲切人声朗读。
            </p>
            <ReadAloudControls className="mt-2" />
          </div>
        </div>
      </Card>
      <Card className="min-h-[360px] flex flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[48vh]">
          {chat.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-white ml-8 border' : 'bg-emerald-50/90 mr-8'}`}
            >
              {m.role === 'assistant' ? (
                <SpeakableBlock text={m.content} kind="general">
                  <MarkdownLite text={m.content} />
                </SpeakableBlock>
              ) : (
                m.content
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void ask()}
            className="flex-1 rounded-2xl border px-3 py-2"
            placeholder="想说点什么…"
          />
          <PrimaryButton disabled={busy || !input.trim()} onClick={() => void ask()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </PrimaryButton>
        </div>
      </Card>
    </Shell>
  );
}
