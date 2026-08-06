import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, MarkdownLite, PrimaryButton, Shell } from '@/components/ui';
import { MATH_ASSESSMENT_BANK, SUBJECT_KB, normalizeAnswer } from '@/lib/knowledge';
import { extractJson, schoolChat, withAgeBand } from '@/lib/llm';
import type { SubjectId } from '@/lib/types';
import { SUBJECTS } from '@/lib/types';
import { useSchoolStore } from '@/store/school';

type Tab = 'profile' | 'tasks' | 'practice' | 'wrong' | 'report' | 'assess';

const SUBJECT_TEACHER: Record<string, { name: string; emoji: string; persona: string }> = {
  math: { name: '小数老师', emoji: '🔢', persona: '幽默严谨的数学老师' },
  chinese: { name: '小语老师', emoji: '📖', persona: '温柔有文采的语文老师' },
  english: { name: '小英老师', emoji: '🌍', persona: '活泼双语的英语老师' },
};

export default function SubjectHallPage() {
  const { subject = 'math' } = useParams();
  const sid = subject as SubjectId;
  const meta = SUBJECTS.find((s) => s.id === sid);
  const teacher = SUBJECT_TEACHER[sid] || SUBJECT_TEACHER.math;
  const student = useSchoolStore((s) => s.student)!;
  const assessment = useSchoolStore((s) => s.assessments[sid]);
  const plan = useSchoolStore((s) => s.plans[sid]);
  const wrongBook = useSchoolStore((s) => s.wrongBook.filter((w) => w.subject === sid));
  const practices = useSchoolStore((s) => s.practices.filter((p) => p.subject === sid));
  const setAssessment = useSchoolStore((s) => s.setAssessment);
  const setPlan = useSchoolStore((s) => s.setPlan);
  const toggleTask = useSchoolStore((s) => s.toggleTask);
  const addPractice = useSchoolStore((s) => s.addPractice);
  const retryRemoveWrong = useSchoolStore((s) => s.retryRemoveWrong);

  const [tab, setTab] = useState<Tab>(assessment?.done ? 'tasks' : 'assess');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [practiceQ, setPracticeQ] = useState<{ question: string; knowledge: string; answer: string } | null>(null);
  const [userAns, setUserAns] = useState('');
  const [feedback, setFeedback] = useState('');
  const bank = useMemo(() => (sid === 'math' ? MATH_ASSESSMENT_BANK : MATH_ASSESSMENT_BANK.slice(0, 10)), [sid]);

  const submitAssessment = async () => {
    setBusy(true);
    try {
      let correct = 0;
      const weak: string[] = [];
      const strong: string[] = [];
      const mastery: Record<string, number> = {};
      for (const item of bank) {
        const ok = normalizeAnswer(answers[item.id] || '') === normalizeAnswer(item.a);
        mastery[item.knowledge] = (mastery[item.knowledge] || 0) + (ok ? 1 : 0);
        if (ok) {
          correct += 1;
          strong.push(item.knowledge);
        } else weak.push(item.knowledge);
      }
      const score = Math.round((correct / bank.length) * 100);
      const prompt = await schoolChat({
        system: withAgeBand(
          `你是${teacher.persona}。根据测评结果用简洁中文输出 JSON：{"strengths":[],"weaknesses":[],"advice":""}`,
          student.ageBand,
        ),
        user: `得分${score}。答对知识点:${[...new Set(strong)].join(',')}。薄弱:${[...new Set(weak)].join(',')}`,
      });
      const parsed = extractJson<{ strengths?: string[]; weaknesses?: string[]; advice?: string }>(prompt);
      setAssessment({
        subject: sid,
        done: true,
        score,
        strengths: parsed?.strengths || [...new Set(strong)].slice(0, 4),
        weaknesses: parsed?.weaknesses || [...new Set(weak)].slice(0, 4),
        mastery,
        completedAt: new Date().toISOString(),
      });
      toast.success('学情测评完成！');
      setTab('profile');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '测评分析失败');
    } finally {
      setBusy(false);
    }
  };

  const genPlan = async () => {
    setBusy(true);
    try {
      const text = await schoolChat({
        system: withAgeBand(
          `你是${teacher.persona}。结合知识库与学情，输出今日学习方案 JSON：{"tasks":[{"id":"t1","title":"","kind":"讲解|例题|练习|测验"}]}，3-5项。\n知识库：${SUBJECT_KB[sid]}`,
          student.ageBand,
        ),
        user: `学生${student.name}，测评得分${assessment?.score ?? '未测'}，弱项:${assessment?.weaknesses?.join(',') || '综合'}`,
      });
      const parsed = extractJson<{ tasks?: Array<{ id: string; title: string; kind: string }> }>(text);
      const tasks = (parsed?.tasks || [
        { id: 't1', title: '回顾薄弱知识点', kind: '讲解' },
        { id: 't2', title: '做 3 道巩固练习', kind: '练习' },
        { id: 't3', title: '错题重练 1 题', kind: '测验' },
      ]).map((t, i) => ({ ...t, id: t.id || `t${i + 1}`, done: false }));
      setPlan({ subject: sid, date: new Date().toISOString().slice(0, 10), tasks, generatedAt: new Date().toISOString() });
      setTab('tasks');
      toast.success('今日方案已生成');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '方案生成失败');
    } finally {
      setBusy(false);
    }
  };

  const nextPractice = async (knowledgeHint?: string) => {
    setBusy(true);
    setFeedback('');
    setUserAns('');
    try {
      const text = await schoolChat({
        system: withAgeBand(
          `你是${teacher.persona}。出 1 道适合学生的题，输出 JSON：{"question":"","knowledge":"","answer":"","hint":""}。可用 $LaTeX$。知识库：${SUBJECT_KB[sid]}`,
          student.ageBand,
        ),
        user: `针对知识点：${knowledgeHint || assessment?.weaknesses?.[0] || '综合基础'}，难度适中。`,
      });
      const parsed = extractJson<{ question: string; knowledge: string; answer: string }>(text);
      if (!parsed?.question) throw new Error('题目生成失败');
      setPracticeQ(parsed);
      setTab('practice');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '出题失败');
    } finally {
      setBusy(false);
    }
  };

  const gradePractice = async () => {
    if (!practiceQ) return;
    setBusy(true);
    try {
      const autoOk = normalizeAnswer(userAns) === normalizeAnswer(practiceQ.answer);
      const text = await schoolChat({
        system: withAgeBand(
          `你是${teacher.persona}。判题并讲解。输出 JSON：{"correct":true/false,"explanation":"","correctAnswer":""}`,
          student.ageBand,
        ),
        user: `题目：${practiceQ.question}\n参考答案：${practiceQ.answer}\n学生作答：${userAns}\n若可自动判断是否正确：${autoOk}`,
      });
      const parsed = extractJson<{ correct: boolean; explanation: string; correctAnswer?: string }>(text);
      const correct = parsed?.correct ?? autoOk;
      const explanation = parsed?.explanation || (correct ? '很棒，答案正确！' : `再想想。参考答案：${practiceQ.answer}`);
      addPractice({
        subject: sid,
        question: practiceQ.question,
        userAnswer: userAns,
        correct,
        explanation,
        knowledge: practiceQ.knowledge || '综合',
      });
      setFeedback(explanation);
      toast.success(correct ? '答对了！' : '已收入错题本');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '判题失败');
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'assess', label: '学情测评' },
    { id: 'profile', label: '学情档案' },
    { id: 'tasks', label: '今日任务' },
    { id: 'practice', label: '练习题' },
    { id: 'wrong', label: '错题本' },
    { id: 'report', label: '学习报告' },
  ];

  if (!meta) {
    return (
      <Shell title="未知教学楼">
        <Card>找不到该学科</Card>
      </Shell>
    );
  }

  return (
    <Shell title={`${meta.name} · ${teacher.name}`}>
      <Card className="mb-4 bg-gradient-to-r from-white to-campus-cream/80">
        <div className="flex gap-4 items-center">
          <div className="text-5xl">{teacher.emoji}</div>
          <div>
            <div className="font-display text-2xl">{teacher.name}</div>
            <p className="text-sm text-campus-ink/70 mt-1">
              欢迎来到教室！黑板擦得亮亮的，我们从学情开始，再做今日任务和练习。
            </p>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold border ${tab === t.id ? 'bg-campus-mint text-white border-campus-mint' : 'bg-white/80 border-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'assess' && (
        <Card>
          <h3 className="font-bold text-lg">首次学情测评（{bank.length} 题）</h3>
          <p className="text-sm text-campus-ink/65 mt-1">答完后老师会生成雷达式学情分析。</p>
          <div className="mt-4 space-y-4">
            {bank.map((item, idx) => (
              <div key={item.id} className="rounded-2xl bg-campus-cream/70 p-3">
                <div className="text-sm font-bold">
                  {idx + 1}. [{item.knowledge}] {item.q}
                </div>
                <input
                  value={answers[item.id] || ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [item.id]: e.target.value }))}
                  className="mt-2 w-full rounded-xl border px-3 py-2"
                  placeholder="你的答案"
                />
              </div>
            ))}
          </div>
          <PrimaryButton className="mt-4" disabled={busy} onClick={submitAssessment}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            提交测评
          </PrimaryButton>
        </Card>
      )}

      {tab === 'profile' && (
        <Card>
          {!assessment?.done ? (
            <p>还没测评，先去做学情测评吧。</p>
          ) : (
            <>
              <div className="font-display text-xl">得分 {assessment.score}</div>
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <div className="rounded-2xl bg-green-50 p-3">
                  <div className="font-bold text-green-700">强项</div>
                  <div className="text-sm mt-1">{assessment.strengths.join('、') || '—'}</div>
                </div>
                <div className="rounded-2xl bg-orange-50 p-3">
                  <div className="font-bold text-orange-700">弱项</div>
                  <div className="text-sm mt-1">{assessment.weaknesses.join('、') || '—'}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="font-bold mb-2">知识点掌握（示意雷达条）</div>
                {Object.entries(assessment.mastery).map(([k, v]) => (
                  <div key={k} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{k}</span>
                      <span>{v > 0 ? '较稳' : '待加强'}</span>
                    </div>
                    <div className="h-2 rounded-full bg-campus-ink/10 overflow-hidden">
                      <div className="h-full bg-campus-mint" style={{ width: `${Math.min(100, v * 50 + (assessment.score > 70 ? 40 : 20))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <PrimaryButton className="mt-4" disabled={busy} onClick={genPlan}>
                生成今日学习方案
              </PrimaryButton>
            </>
          )}
        </Card>
      )}

      {tab === 'tasks' && (
        <Card>
          {!plan ? (
            <div>
              <p className="text-sm">还没有今日任务。</p>
              <PrimaryButton className="mt-3" disabled={busy || !assessment?.done} onClick={genPlan}>
                AI 生成方案
              </PrimaryButton>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-campus-ink/60">日期 {plan.date}</div>
              {plan.tasks.map((t) => (
                <label key={t.id} className="flex items-center gap-3 rounded-2xl bg-campus-cream/60 px-3 py-3">
                  <input type="checkbox" checked={t.done} onChange={() => toggleTask(sid, t.id)} />
                  <div>
                    <div className="font-bold">{t.title}</div>
                    <div className="text-xs text-campus-ink/60">{t.kind}</div>
                  </div>
                </label>
              ))}
              <p className="text-xs text-campus-mint mt-2">全部完成后将解锁今日娱乐时间。</p>
            </div>
          )}
        </Card>
      )}

      {tab === 'practice' && (
        <Card>
          <div className="flex gap-2 mb-3">
            <PrimaryButton disabled={busy} onClick={() => nextPractice()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              AI 出题
            </PrimaryButton>
          </div>
          {practiceQ ? (
            <>
              <div className="rounded-2xl bg-campus-cream/70 p-4">
                <div className="text-xs text-campus-ink/60 mb-1">知识点：{practiceQ.knowledge}</div>
                <MarkdownLite text={practiceQ.question} />
              </div>
              <input
                value={userAns}
                onChange={(e) => setUserAns(e.target.value)}
                className="mt-3 w-full rounded-xl border px-3 py-2"
                placeholder="写下你的答案"
              />
              <PrimaryButton className="mt-3" disabled={busy || !userAns.trim()} onClick={gradePractice}>
                提交判分
              </PrimaryButton>
              {feedback && (
                <div className="mt-3 rounded-2xl bg-white border p-3 text-sm">
                  <MarkdownLite text={feedback} />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-campus-ink/65">点「AI 出题」开始练习。</p>
          )}
        </Card>
      )}

      {tab === 'wrong' && (
        <Card>
          {wrongBook.length === 0 ? (
            <p className="text-sm">暂无错题，真厉害！</p>
          ) : (
            <div className="space-y-3">
              {wrongBook.map((w) => (
                <div key={w.id} className="rounded-2xl border p-3">
                  <div className="text-xs text-campus-ink/60">{w.knowledge}</div>
                  <div className="font-bold mt-1">{w.question}</div>
                  <div className="text-sm mt-1">我的答案：{w.userAnswer}</div>
                  <div className="text-sm text-campus-ink/70 mt-1">{w.explanation}</div>
                  <div className="flex gap-2 mt-2">
                    <PrimaryButton
                      onClick={async () => {
                        await nextPractice(w.knowledge);
                        retryRemoveWrong(w.id);
                      }}
                    >
                      重练同类
                    </PrimaryButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'report' && (
        <Card>
          <h3 className="font-bold text-lg">学习报告</h3>
          <ul className="mt-3 text-sm space-y-1">
            <li>练习次数：{practices.length}</li>
            <li>正确率：{practices.length ? Math.round((practices.filter((p) => p.correct).length / practices.length) * 100) : 0}%</li>
            <li>错题数：{wrongBook.length}</li>
            <li>测评得分：{assessment?.score ?? '未测评'}</li>
            <li>弱项：{assessment?.weaknesses?.join('、') || '—'}</li>
          </ul>
          <p className="text-xs text-campus-ink/60 mt-3">家长中心可查看完整报告与情绪摘要。</p>
        </Card>
      )}
    </Shell>
  );
}
