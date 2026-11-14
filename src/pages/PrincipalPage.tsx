import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Card, MarkdownLite, PrimaryButton, Shell } from '@/components/ui';
import { SpeakableBlock } from '@/components/ReadAloudButton';
import { schoolChat, withAgeBand } from '@/lib/llm';
import { useSchoolStore } from '@/store/school';
import { SCENES } from '@/lib/scenes';
import { PRINCIPAL_AGENT_SRC } from '@/lib/morning-speak';
import { getStudentTitle } from '@/lib/types';
import { DEFAULT_STUDY_TIME_PLAN, studyTimeSummaryText } from '@/lib/study-time';
import { TalkingPrincipalAvatar } from '@/components/TalkingTeacher';
import { ReadAloudControls } from '@/components/ReadAloudControls';
import { speakPrincipalAloud } from '@/lib/read-aloud';
import { PrincipalIntakeFlow } from '@/components/PrincipalIntakeFlow';
import { goCampus } from '@/lib/go-campus';
import { iqeTeacherContext } from '@/lib/iqe-profile';
import { Link, Navigate } from 'react-router-dom';

export default function PrincipalPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const student = useSchoolStore((s) => s.student)!;
  const assessments = useSchoolStore((s) => s.assessments);
  const practices = useSchoolStore((s) => s.practices);
  const studyTimePlan = useSchoolStore((s) => s.studyTimePlan) || DEFAULT_STUDY_TIME_PLAN;
  const teacherTone = useSchoolStore((s) => s.parent?.teacherTone || 'balanced');
  const chat = useSchoolStore((s) => s.principalChat);
  const pushChat = useSchoolStore((s) => s.pushChat);
  const principalIntakeDone = useSchoolStore((s) => s.principalIntakeDone);
  const principalIntake = useSchoolStore((s) => s.principalIntake);
  const iqeResult = useSchoolStore((s) => s.iqeResult);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const forceIntake = params.get('intake') === '1' || principalIntakeDone === false;
  const showIntake = forceIntake && !principalIntakeDone;

  const greeting = useMemo(() => {
    const title = getStudentTitle(student.grade, student.gradeYear);
    if (showIntake) {
      return `${title}${student.name}，欢迎入学，请到测评间完成真实任务，学习建议会依据任务证据生成。`;
    }
    return `欢迎回来。可继续咨询全局学习安排；入学方案已下发给各科老师。`;
  }, [showIntake, student]);

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
      const title = getStudentTitle(student.grade, student.gradeYear);
      const intakeBlock = principalIntake
        ? `入学任务摘要：${principalIntake.summary}；薄弱：${principalIntake.weaknesses.join('、')}；停滞：${principalIntake.stagnant.join('、')}`
        : '尚无入学任务证据';
      const reply = await schoolChat({
        system: withAgeBand(
          `你是AI一人学校的女校长（约45岁）：庄重、有智慧、言简意赅。综合各科学情与入学任务证据，给出全局优先级建议。可聊目标与烦恼，但引导回成长。称呼学生为「${title}」。语气正式，不卖萌。`,
          student.ageBand,
          teacherTone,
          { role: 'principal', student },
        ),
        history: chat.slice(-8).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        user: `${intakeBlock}。${iqeTeacherContext(iqeResult) || '以已有任务证据为准'}。学情概览：${overview || '暂无'}。练习${practices.length}次。家长设定学习时长：${studyTimeSummaryText(studyTimePlan)}。请按主科/副科占比给优先级。${title}说：${trimmed}`,
        prefer: 'auto',
      });
      pushChat('principal', { role: 'assistant', content: reply });
      void speakPrincipalAloud(reply, student.grade).catch(() => undefined);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '校长暂时忙线');
    } finally {
      setBusy(false);
    }
  };

  if (forceIntake) return <Navigate to="/assessment" replace />;

  return (
    <Shell
      title="校长办公楼"
      sceneSrc={SCENES.principal}
      onBack={() => {
        goCampus(navigate);
        return false;
      }}
    >
      <Card className="mb-4">
        <div className="flex gap-3 items-center">
          <TalkingPrincipalAvatar
            src={PRINCIPAL_AGENT_SRC}
            size={96}
            onClick={() => {
              const last = [...chat].reverse().find((m) => m.role === 'assistant');
              const text = last?.content || greeting;
              void speakPrincipalAloud(text, student.grade);
            }}
          />
          <div>
            <div className="font-display text-2xl">校长办公室</div>
            <p className="text-sm text-campus-ink/70 mt-1 leading-relaxed">{greeting}</p>
            <ReadAloudControls className="mt-2" />
          </div>
        </div>
        {!showIntake && (
          <div className="mt-3 flex flex-wrap gap-2">
            <PrimaryButton
              disabled={busy}
              onClick={() => ask('请根据我目前的各科学情，给我本周学习优先级建议。')}
            >
              生成本周全局建议
            </PrimaryButton>
            {!iqeResult && (
              <Link
                to="/iqe?from=intake"
                className="rounded-full px-4 py-2 text-sm font-bold border border-violet-300 bg-violet-50 text-violet-800"
              >
                查看入学任务与报告
              </Link>
            )}
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-bold border bg-white hover:border-campus-mint"
              onClick={() => goCampus(navigate)}
            >
              返回校园
            </button>
          </div>
        )}
      </Card>

      {showIntake ? (
        <Card>
          <PrincipalIntakeFlow />
        </Card>
      ) : (
        <Card className="min-h-[360px] flex flex-col">
          {principalIntake && (
            <div className="mb-3 rounded-2xl border border-campus-mint/25 bg-campus-mint/5 px-3 py-2 text-xs text-campus-ink/75">
              <span className="font-bold text-campus-mint">入学方案已下发 · </span>
              {principalIntake.summary}
            </div>
          )}
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[48vh]">
            {chat.length === 0 && (
              <p className="text-sm text-campus-ink/60">还没有对话，先问问校长本周怎么安排吧。</p>
            )}
            {chat.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-campus-mint/15 ml-8' : 'bg-campus-cream mr-8'
                }`}
              >
                {m.role === 'assistant' ? (
                  <SpeakableBlock text={m.content} kind="general">
                    <MarkdownLite text={m.content} />
                  </SpeakableBlock>
                ) : (
                  <MarkdownLite text={m.content} />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void ask(input)}
              className="flex-1 rounded-2xl border px-3 py-2 bg-white"
              placeholder="向校长提问…"
            />
            <PrimaryButton disabled={busy || !input.trim()} onClick={() => void ask(input)}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </PrimaryButton>
          </div>
        </Card>
      )}
    </Shell>
  );
}
