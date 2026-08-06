import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Card, MarkdownLite, PrimaryButton, Shell } from '@/components/ui';
import { schoolChat, withAgeBand } from '@/lib/llm';
import { useSchoolStore } from '@/store/school';

export default function PrincipalPage() {
  const student = useSchoolStore((s) => s.student)!;
  const assessments = useSchoolStore((s) => s.assessments);
  const practices = useSchoolStore((s) => s.practices);
  const chat = useSchoolStore((s) => s.principalChat);
  const pushChat = useSchoolStore((s) => s.pushChat);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    pushChat('principal', { role: 'user', content: trimmed });
    setInput('');
    setBusy(true);
    try {
      const overview = Object.entries(assessments)
        .map(([k, v]) => `${k}:${v?.score ?? '-'}(弱:${v?.weaknesses?.join('/') || '-'})`)
        .join('；');
      const reply = await schoolChat({
        system: withAgeBand(
          '你是AI一人学校的校长：温和、有智慧、不啰嗦。综合各科学情，给出全局优先级建议。可聊目标与烦恼，但引导回成长。',
          student.ageBand,
        ),
        history: chat.slice(-8).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        user: `学情概览：${overview || '暂无'}。练习${practices.length}次。学生说：${trimmed}`,
      });
      pushChat('principal', { role: 'assistant', content: reply });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '校长暂时忙线');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="校长办公楼">
      <Card className="mb-4">
        <div className="flex gap-3 items-center">
          <div className="text-5xl">🎩</div>
          <div>
            <div className="font-display text-2xl">校长办公室</div>
            <p className="text-sm text-campus-ink/70">总指令官在此统筹各科节奏，欢迎来聊目标与烦恼。</p>
          </div>
        </div>
        <PrimaryButton
          className="mt-3"
          disabled={busy}
          onClick={() => ask('请根据我目前的各科学情，给我本周学习优先级建议。')}
        >
          生成本周全局建议
        </PrimaryButton>
      </Card>
      <Card className="min-h-[360px] flex flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[48vh]">
          {chat.length === 0 && <p className="text-sm text-campus-ink/60">还没有对话，先问问校长本周怎么安排吧。</p>}
          {chat.map((m) => (
            <div key={m.id} className={`rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-campus-mint/15 ml-8' : 'bg-campus-cream mr-8'}`}>
              <MarkdownLite text={m.content} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask(input)}
            className="flex-1 rounded-2xl border px-3 py-2"
            placeholder="跟校长说点什么…"
          />
          <PrimaryButton disabled={busy} onClick={() => ask(input)}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </PrimaryButton>
        </div>
      </Card>
    </Shell>
  );
}
