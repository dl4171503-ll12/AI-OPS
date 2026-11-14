import { historyContext, guardMentorReply, UNITS, exercise } from '@/lib/ops';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ExternalLink, Loader2, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Card, MarkdownLite, PrimaryButton, Shell } from '@/components/ui';
import { SpeakableBlock } from '@/components/ReadAloudButton';
import { TalkingTeacherFace } from '@/components/TalkingTeacher';
import { ReadAloudControls } from '@/components/ReadAloudControls';
import { MATH_ASSESSMENT_BANK, SUBJECT_KB, normalizeAnswer } from '@/lib/knowledge';
import { extractJson, schoolChat, withAgeBand } from '@/lib/llm';
import type { SubjectId } from '@/lib/types';
import { SUBJECTS, bandLabel } from '@/lib/types';
import { speakTeacherAloud, subjectReadAloudKind } from '@/lib/read-aloud';
import { useSchoolStore } from '@/store/school';
import { SCENES } from '@/lib/scenes';
import { DEFAULT_STUDY_TIME_PLAN, computeSubjectMinutes, studyTimeSummaryText } from '@/lib/study-time';
import {
  fetchLatestMaterials,
  type MaterialsPack,
  type SchoolSearchItem,
} from '@/lib/school-web-search';
import { getTeacher, type TeacherMeta } from '@/lib/teachers';
import { TEACHER_TONE_OPTIONS, type TeacherTone } from '@/lib/types';
import { edgeVoiceForSpeak } from '@/lib/edge-voices';
import { effectiveSpeakTone, resolveGradeYear } from '@/lib/grade-speak';
import { teacherGradePedagogy, teacherTutorPedagogy, inferTutorPhaseFromHistory } from '@/lib/teacher-pedagogy';
import { editionContextLine, editionLabel, resolveEdition } from '@/lib/textbook-map';
import { iqeTeacherContext } from '@/lib/iqe-profile';
import {
  accessBlockMessage,
  bumpGuestTutorCount,
  canGuestAskTutor,
  canUseFullTeacherTools,
  GUEST_TUTOR_LIMIT,
  getGuestTutorCount,
} from '@/lib/access';
import {
  defaultTrackForSubject,
  kbForTrack,
  trackLabel,
  trackPromptBlock,
  tracksForSubject,
  type ScienceTrack,
  type SubjectTrack,
} from '@/lib/subject-tracks';
import { FREE_LAB_MS, labsForTrack } from '@/lib/science-labs';
import { ScienceLabWorkbench } from '@/components/ScienceLabWorkbench';
import { getLabById } from '@/lib/science-labs';
import { intakeTeacherContext } from '@/lib/principal-intake';
import {
  createLabMissionDraft,
  formatMissionAskReply,
  formatMissionFindingsFeedback,
  formatMissionOpenReply,
  formatMissionReflectPrompt,
  isLabAccessRequest,
  isLabMissionDoneEarly,
} from '@/lib/lab-mission';
import {
  AI_LEVEL_ASK,
  AI_SKILL_OPTIONS,
  aiLevelLabel,
  aiLevelOpening,
  aiLevelSystemPrompt,
  type AiSkillLevel,
} from '@/lib/ai-teacher';

type Tab = 'profile' | 'tasks' | 'practice' | 'wrong' | 'report' | 'assess' | 'tutor' | 'paper' | 'materials' | 'lab';

type ChatTurn = { role: 'user' | 'assistant'; content: string };

function TeacherAgentCard({
  teacher,
  subjectName,
  greeting,
  onSpeak,
  teacherTone,
  onToneChange,
  subjectId,
  gradeYear,
}: {
  teacher: TeacherMeta;
  subjectName: string;
  greeting: string;
  onSpeak: () => void;
  teacherTone: TeacherTone;
  onToneChange: (t: TeacherTone) => void;
  subjectId: SubjectId;
  gradeYear: number;
}) {
  const voice = edgeVoiceForSpeak({
    role: 'teacher',
    subject: subjectId,
    tone: effectiveSpeakTone(gradeYear, teacherTone, 'teacher'),
  });
  return (
    <div className="flex gap-3 items-start mb-4">
      <TalkingTeacherFace
        src={teacher.avatar}
        emoji={teacher.emoji}
        name={teacher.name}
        size={96}
        onClick={onSpeak}
        title={`点头像：${teacher.name}朗读（Edge TTS）`}
      />
      <div className="min-w-0 flex-1">
        <div className="font-bold text-lg flex flex-wrap items-center gap-2">
          {teacher.name}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-campus-mint/15 text-campus-mint">
            Agent · {subjectName}
          </span>
          {teacher.gender === 'male' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
              温和男老师
            </span>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-campus-sun/35 text-campus-ink/80">
            {voice.label}
          </span>
        </div>
        <p className="text-sm text-campus-ink/75 mt-1 leading-relaxed">{greeting}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[10px] font-bold text-campus-ink/45 self-center">说话方式</span>
          {TEACHER_TONE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToneChange(opt.id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold border transition ${
                teacherTone === opt.id
                  ? 'bg-campus-mint text-white border-campus-mint'
                  : 'bg-white border-campus-ink/10 hover:border-campus-mint/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-campus-ink/45 mt-1">
          {subjectId === 'ai'
            ? '点头像或等老师回复即可朗读；有 coding 基础时小智会直接给改法，不绕弯慢引导。'
            : '点头像或等老师回复即可朗读；辅导固定四步：先给材料 → 带支架思考 → 问为什么 → 再给答案。'}
        </p>
        <ReadAloudControls className="mt-2" />
      </div>
    </div>
  );
}

export default function SubjectHallPage() {
  const { subject = 'math' } = useParams();
  const sid = subject as SubjectId;
  const meta = SUBJECTS.find((s) => s.id === sid);
  const teacher = getTeacher(sid);
  const student = useSchoolStore((s) => s.student);
  const assessment = useSchoolStore((s) => s.assessments?.[sid]);
  const plan = useSchoolStore((s) => s.plans?.[sid]);
  const wrongBookAll = useSchoolStore((s) => s.wrongBook);
  const practicesAll = useSchoolStore((s) => s.practices);
  const setAssessment = useSchoolStore((s) => s.setAssessment);
  const setPlan = useSchoolStore((s) => s.setPlan);
  const toggleTask = useSchoolStore((s) => s.toggleTask);
  const addPractice = useSchoolStore((s) => s.addPractice);
  const retryRemoveWrong = useSchoolStore((s) => s.retryRemoveWrong);
  const studyTimePlanRaw = useSchoolStore((s) => s.studyTimePlan);
  const studyTimePlan = studyTimePlanRaw || DEFAULT_STUDY_TIME_PLAN;
  const teacherTone = useSchoolStore((s) => s.parent?.teacherTone || 'balanced');
  const setParent = useSchoolStore((s) => s.setParent);
  const unlockFreeLab = useSchoolStore((s) => s.unlockFreeLab);
  const markLabCompleted = useSchoolStore((s) => s.markLabCompleted);
  const freeLabUntil = useSchoolStore((s) => s.freeLabUntil);
  const labMission = useSchoolStore((s) => s.labMission);
  const setLabMission = useSchoolStore((s) => s.setLabMission);
  const grantLabMissionAccess = useSchoolStore((s) => s.grantLabMissionAccess);
  const beginLabMissionReflect = useSchoolStore((s) => s.beginLabMissionReflect);
  const completeLabMissionFindings = useSchoolStore((s) => s.completeLabMissionFindings);
  const principalIntake = useSchoolStore((s) => s.principalIntake);
  const iqeResult = useSchoolStore((s) => s.iqeResult);
  const editionPrefs = useSchoolStore((s) => s.editionPrefs);
  const aiSkillLevel = useSchoolStore((s) => s.aiSkillLevel);
  const setAiSkillLevel = useSchoolStore((s) => s.setAiSkillLevel);

  const gradeYear = resolveGradeYear(student || undefined);
  const edition = useMemo(
    () => resolveEdition(editionPrefs, sid, gradeYear),
    [editionPrefs, sid, gradeYear],
  );
  const editionLine = useMemo(
    () => editionContextLine(editionPrefs, sid, gradeYear),
    [editionPrefs, sid, gradeYear],
  );
  const iqeLine = useMemo(() => iqeTeacherContext(iqeResult), [iqeResult]);

  const wrongBook = useMemo(
    () => (Array.isArray(wrongBookAll) ? wrongBookAll : []).filter((w) => w.subject === sid),
    [wrongBookAll, sid],
  );
  const practices = useMemo(
    () => (Array.isArray(practicesAll) ? practicesAll : []).filter((p) => p.subject === sid),
    [practicesAll, sid],
  );

  const subjectMinutes = useMemo(() => {
    try {
      return computeSubjectMinutes(studyTimePlan)[sid] || 0;
    } catch {
      return 0;
    }
  }, [studyTimePlan, sid]);

  // 默认进入老师对话界面
  const [tab, setTab] = useState<Tab>('tutor');
  const [track, setTrack] = useState<SubjectTrack>(() => defaultTrackForSubject(sid));
  const [labExpId, setLabExpId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [practiceQ, setPracticeQ] = useState<{ question: string; knowledge: string; answer: string } | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [practiceStarted, setPracticeStarted] = useState(Date.now());
  const [revisions, setRevisions] = useState<Array<{ answer: string; at: string }>>([]);
  const [retryId, setRetryId] = useState<string | undefined>();
  const subjectChat: typeof schoolChat = (opts) => {
    const state = useSchoolStore.getState();
    const context = state.ops.cloudHistory ? historyContext(state, sid) : '历史数据未授权发送，不能声称知道学生过去的表现。';
    return schoolChat({ ...opts, system: opts.system + '\n' + context });
  };
  const [userAns, setUserAns] = useState('');
  const [feedback, setFeedback] = useState('');
  const [tutorInput, setTutorInput] = useState('');
  const [tutorChat, setTutorChat] = useState<ChatTurn[]>([]);
  const [aiEngine, setAiEngine] = useState<'auto' | 'deepseek' | 'kimi'>('auto');
  const [paperText, setPaperText] = useState('');
  const [paperTopic, setPaperTopic] = useState('');
  const [materials, setMaterials] = useState<MaterialsPack | null>(null);
  const [materialsTopic, setMaterialsTopic] = useState('');
  const [reflectPrompted, setReflectPrompted] = useState(false);
  const bank = useMemo(() => (sid === 'math' ? MATH_ASSESSMENT_BANK : UNITS.filter(u => u.subject === sid).flatMap(u => Array.from({ length: 5 }, (_, i) => { const q = exercise(u.id, i); return { id: u.id + '-' + i, knowledge: u.title, q: q.question, a: q.answer }; }))), [sid]);
  const scene = SCENES.classroom[sid] || SCENES.classroom.math;
  const readKind = subjectReadAloudKind(sid);

  // 任务权限到期 → 进入「汇报发现」；回到辅导页时老师主动追问
  useEffect(() => {
    if (sid !== 'science' || !labMission) return;
    if (labMission.phase === 'open' && labMission.until) {
      const left = new Date(labMission.until).getTime() - Date.now();
      if (left <= 0) {
        beginLabMissionReflect();
        toast.message('实验时间已经到期了，快去找老师分享本次实验结果吧！');
        return;
      }
      const t = window.setTimeout(() => {
        beginLabMissionReflect();
        toast.message('实验时间已经到期了，快去找老师分享本次实验结果吧！');
      }, left);
      return () => window.clearTimeout(t);
    }
  }, [sid, labMission?.phase, labMission?.until, labMission?.id, beginLabMissionReflect]);

  useEffect(() => {
    if (sid !== 'science' || !student) return;
    if (labMission?.phase !== 'reflect' || reflectPrompted || tab !== 'tutor') return;
    const prompt = formatMissionReflectPrompt(student.name, labMission.question);
    setTutorChat((prev) => [...prev, { role: 'assistant', content: prompt }]);
    setReflectPrompted(true);
    void speakTeacherAloud(prompt, student.grade, sid).catch(() => undefined);
  }, [sid, labMission?.phase, labMission?.question, reflectPrompted, tab, student]);

  useEffect(() => {
    if (labMission?.phase !== 'reflect') setReflectPrompted(false);
  }, [labMission?.phase]);

  // 副科（科学/艺术/体育/AI）取消练习题等页签后，纠正非法 tab
  useEffect(() => {
    const major = ['math', 'chinese', 'english'].includes(sid);
    const allowed = major
      ? (['tutor', 'materials', 'paper', 'assess', 'profile', 'tasks', 'practice', 'wrong', 'report'] as Tab[])
      : (['tutor', 'materials', 'assess', 'profile', 'tasks'] as Tab[]);
    if (!allowed.includes(tab)) {
      setTab('tutor');
      setLabExpId(null);
    }
  }, [sid, tab]);

  if (!student) {
    return <Navigate to="/onboarding" replace />;
  }

  const prefer = aiEngine === 'auto' ? 'auto' : aiEngine === 'kimi' ? 'kimi' : 'deepseek';
  const subjectShort = (meta?.name || '').replace(/(楼|中心)$/, '') || sid;
  const subjectTracks = tracksForSubject(sid);
  const activeTrackLabel = trackLabel(track) || subjectShort;
  const trackKb = kbForTrack(sid, track);
  const combinedKb = [SUBJECT_KB[sid] || '', trackKb].filter(Boolean).join('\n');
  const greeting =
    tutorChat.length === 0
      ? sid === 'ai'
        ? !aiSkillLevel
          ? AI_LEVEL_ASK
          : `你好，${student.name}！我是${teacher.name}。你的水平是「${aiLevelLabel(aiSkillLevel)}」，我们按这个进度练 AI 技术。有问题直接问我～`
        : sid === 'chinese'
          ? `你好，${student.name}！我是${teacher.name}，负责语文、历史、地理。当前在学「${activeTrackLabel}」，有不会的直接问我～`
          : sid === 'science'
            ? `你好，${student.name}！我是${teacher.name}，负责科学、物理、化学、生物，还带虚拟实验室。当前「${activeTrackLabel}」。想暂时进实验室可以说「打开实验室」——我会先给你观察问题，再开门禁；时间到会关掉，并问你发现了什么。`
            : `你好，${student.name}！我是${teacher.name}，今天我们一起学${subjectShort}。有不会的直接问我，也可以让我帮你搜最新学习视频～`
      : `${teacher.name}在线 · DeepSeek / Kimi 双引擎辅导`;

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
      const prompt = await subjectChat({
        prefer,
        system: withAgeBand(
          `你是${teacher.persona}。根据测评结果用简洁中文输出 JSON：{"strengths":[],"weaknesses":[],"advice":""}`,
          student.ageBand,
          teacherTone,
          { role: 'teacher', student },
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
      setTab('tutor');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '测评分析失败');
    } finally {
      setBusy(false);
    }
  };

  const genPlan = async () => {
    setBusy(true);
    try {
      const text = await subjectChat({
        prefer,
        system: withAgeBand(
          `你是${teacher.persona}。结合知识库与学情，输出今日学习方案 JSON：{"tasks":[{"id":"t1","title":"","kind":"讲解|例题|练习|测验"}]}，3-5项。
${trackPromptBlock(sid, track)}
知识库：${combinedKb}`,
          student.ageBand,
          teacherTone,
          { role: 'teacher', student },
        ),
        user: `学生${student.name}，测评得分${assessment?.score ?? '未测'}，弱项:${assessment?.weaknesses?.join(',') || '综合'}。家长设定：${studyTimeSummaryText(studyTimePlan)}。本学科今日建议约 ${subjectMinutes} 分钟，请按此时长安排任务量（勿过多）。`,
      });
      const parsed = extractJson<{ tasks?: Array<{ id: string; title: string; kind: string }> }>(text);
      const tasks = (parsed?.tasks || [
        { id: 't1', title: '回顾薄弱知识点', kind: '讲解' },
        { id: 't2', title: '做 3 道巩固练习', kind: '练习' },
        { id: 't3', title: '错题重练 1 题', kind: '测验' },
      ]).map((t, i) => ({ ...t, id: t.id || `t${i + 1}`, done: false }));
      setPlan({ subject: sid, date: new Date().toISOString().slice(0, 10), tasks, generatedAt: new Date().toISOString() });
      setTab('tasks');
      toast.success(`今日方案已生成（约 ${subjectMinutes} 分钟）`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '方案生成失败');
    } finally {
      setBusy(false);
    }
  };

  const nextPractice = async (knowledgeHint?: string, retryOf?: string) => {
    setBusy(true);
    setFeedback('');
    setUserAns('');
    setReasoning('');
    setRevisions([]);
    setRetryId(retryOf);
    try {
      const text = await subjectChat({
        prefer,
        system: withAgeBand(
          `你是${teacher.persona}。出 1 道适合学生的「${activeTrackLabel}」题，输出 JSON：{"question":"","knowledge":"","answer":"","hint":""}。可用 $LaTeX$。
${trackPromptBlock(sid, track)}
知识库：${combinedKb}`,
          student.ageBand,
          teacherTone,
          { role: 'teacher', student },
        ),
        user: `针对知识点：${knowledgeHint || assessment?.weaknesses?.[0] || '综合基础'}，难度适中。`,
      });
      const parsed = extractJson<{ question: string; knowledge: string; answer: string }>(text);
      if (!parsed?.question) throw new Error('题目生成失败');
      setPracticeQ(parsed);
      setPracticeStarted(Date.now());
      setTab('practice');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '出题失败');
    } finally {
      setBusy(false);
    }
  };

  const gradePractice = async () => {
    if (!practiceQ || feedback || busy) return;
    setBusy(true);
    try {
      const autoOk = normalizeAnswer(userAns) === normalizeAnswer(practiceQ.answer);
      const text = await subjectChat({
        prefer,
        system: withAgeBand(
          `你是${teacher.persona}。对学生练习作答给出反馈。${teacherGradePedagogy()}`,
          student.ageBand,
          teacherTone,
          { role: 'teacher', student },
        ),
        user: `题目：${practiceQ.question}\n参考答案：${practiceQ.answer}\n学生作答：${userAns}\n学生推理：${reasoning}\n若可自动判断是否正确：${autoOk}`,
      });
      const parsed = extractJson<{ correct: boolean; explanation: string; correctAnswer?: string }>(text);
      const correct = typeof parsed?.correct === 'boolean' ? parsed.correct : autoOk;
      const explanation = guardMentorReply(parsed?.explanation || (correct ? '你完成了这一步，请说说自己的依据。' : '犯错是学习机制，不是失败。先检查题目条件，再试一个小步骤。'));
      addPractice({
        subject: sid,
        question: practiceQ.question,
        reasoning, durationMs: Math.max(0, Date.now() - practiceStarted), revisions: [...revisions, { answer: userAns, at: new Date().toISOString() }], retryOf: retryId,
        userAnswer: userAns,
        correct,
        explanation,
        knowledge: practiceQ.knowledge || '综合',
      });
      setFeedback(explanation);
      toast.success(correct ? '答对了！' : '已收入错题本');
      void speakTeacherAloud(explanation, student.grade, sid).catch(() => undefined);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '判题失败');
    } finally {
      setBusy(false);
    }
  };

  const askTutor = async () => {
    const q = tutorInput.trim();
    if (!q || busy) return;
    if (sid === 'ai' && !aiSkillLevel) {
      toast.message('先选一个最接近你的 AI 水平，再开始提问～');
      return;
    }
    if (!canGuestAskTutor()) {
      toast.error(
        `试用辅导已达今日上限（${GUEST_TUTOR_LIMIT}次）。请登录手机号解锁完整老师功能。`,
      );
      return;
    }
    setTutorInput('');
    const nextHistory = [...tutorChat, { role: 'user' as const, content: q }];
    setTutorChat(nextHistory);
    setBusy(true);
    try {
      // ── 科学老师：临时开实验室任务流（先提问 → 开门禁 → 汇报发现）──
      if (sid === 'science') {
        const name = student.name;
        const missionOpen =
          labMission?.phase === 'open' &&
          labMission.until &&
          new Date(labMission.until).getTime() > Date.now();

        // 时间已到但还停在 open → 切到追问
        if (labMission?.phase === 'open' && !missionOpen) {
          beginLabMissionReflect();
        }
        const phaseNow =
          labMission?.phase === 'open' && !missionOpen ? 'reflect' : labMission?.phase;

        if (
          (!labMission || labMission.phase === 'done') &&
          isLabAccessRequest(q)
        ) {
          const draft = createLabMissionDraft({
            band: student.ageBand,
            studentHint: q,
          });
          setLabMission(draft);
          const reply = formatMissionAskReply(draft, name);
          setTutorChat([...nextHistory, { role: 'assistant', content: reply }]);
          if (!canUseFullTeacherTools()) bumpGuestTutorCount();
          void speakTeacherAloud(reply, student.grade, sid).catch(() => undefined);
          return;
        }

        if (labMission && phaseNow === 'await_ack') {
          setLabMission({ ...labMission, studentAck: q });
          grantLabMissionAccess();
          const opened = {
            ...labMission,
            studentAck: q,
            phase: 'open' as const,
            durationMs: labMission.durationMs,
          };
          const reply = formatMissionOpenReply(opened, name);
          setTutorChat([...nextHistory, { role: 'assistant', content: reply }]);
          toast.success(`实验室权限已开约 ${Math.round(labMission.durationMs / 60000)} 分钟`);
          if (!canUseFullTeacherTools()) bumpGuestTutorCount();
          void speakTeacherAloud(reply, student.grade, sid).catch(() => undefined);
          return;
        }

        if (labMission && (phaseNow === 'reflect' || (phaseNow === 'open' && isLabMissionDoneEarly(q)))) {
          if (phaseNow === 'open') beginLabMissionReflect();
          // 学生直接汇报发现
          if (q.length >= 4 && !isLabAccessRequest(q)) {
            completeLabMissionFindings(q);
            let reply = formatMissionFindingsFeedback(name, q, labMission.question);
            try {
              const ai = await subjectChat({
                prefer,
                temperature: 0.5,
                max_tokens: 500,
                system: withAgeBand(
                  `你是阿科老师。学生刚完成临时实验室观察任务。根据其发现给予鼓励与一两点科学点评，不超过 120 字。不要再开门禁。`,
                  student.ageBand,
                  teacherTone,
                  { role: 'teacher', student },
                ),
                user: `观察问题：${labMission.question}\n学生发现：${q}`,
              });
              if (ai.trim()) reply = ai.trim();
            } catch {
              /* 用本地模板 */
            }
            setTutorChat([...nextHistory, { role: 'assistant', content: reply }]);
            if (!canUseFullTeacherTools()) bumpGuestTutorCount();
            void speakTeacherAloud(reply, student.grade, sid).catch(() => undefined);
            return;
          }
          const reply = formatMissionReflectPrompt(name, labMission.question);
          setTutorChat([...nextHistory, { role: 'assistant', content: reply }]);
          if (!canUseFullTeacherTools()) bumpGuestTutorCount();
          void speakTeacherAloud(reply, student.grade, sid).catch(() => undefined);
          return;
        }
      }

      const reply = await subjectChat({
        mentor: true,
        prefer,
        temperature: 0.65,
        max_tokens: 2200,
        system: withAgeBand(
          sid === 'ai' && aiSkillLevel
            ? `${aiLevelSystemPrompt(aiSkillLevel)}
${intakeTeacherContext(principalIntake)}
${iqeLine}
${editionLine}
知识库：${combinedKb}
请遵循 OPS 苏格拉底式引导，不替学生完成任务。`
            : `你是「${teacher.name}」，${teacher.persona}。在教室里一对一辅导。可结合学情弱项。
${trackPromptBlock(sid, track)}
${intakeTeacherContext(principalIntake)}
${iqeLine}
${editionLine}
知识库：${combinedKb}
${teacherTutorPedagogy(q, inferTutorPhaseFromHistory(nextHistory))}
若学生第一次提问且未提供题目材料：先给出一段简短「题目/例题材料或情境」（可用知识库），再按四步引导；不要直接给完整标准答案。
${
  sid === 'science'
    ? `关于实验室：学生若要「暂时打开实验室」，你必须先给出一个具体观察问题，等学生表示明白后再开门禁；时间到后追问「实验中发现了什么」。不要一开口就直接开权限。当前任务状态：${labMission?.phase || '无'}。可提醒去「实验室」标签或自由实验室。`
    : ''
}`,
          student.ageBand,
          teacherTone,
          { role: 'teacher', student },
        ),
        history: nextHistory.slice(-10),
        user:
          sid === 'ai' && aiSkillLevel
            ? `学生 AI 水平：${aiLevelLabel(aiSkillLevel)}。学生说：${q}`
            : `当前分科：${activeTrackLabel}。学情弱项：${assessment?.weaknesses?.join('、') || principalIntake?.weaknesses?.join('、') || '暂无'}。学生说：${q}`,
      });
      setTutorChat([...nextHistory, { role: 'assistant', content: reply }]);
      if (!canUseFullTeacherTools()) bumpGuestTutorCount();
      void speakTeacherAloud(reply, student.grade, sid).catch(() => undefined);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '老师暂时忙线');
    } finally {
      setBusy(false);
    }
  };

  const speakGreetingOrLast = () => {
    const lastAssistant = [...tutorChat].reverse().find((m) => m.role === 'assistant');
    const text = lastAssistant?.content || greeting;
    void speakTeacherAloud(text, student.grade, sid).catch((e) => {
      toast.error(e instanceof Error ? e.message : '朗读失败');
    });
  };

  const pickAiLevel = (level: AiSkillLevel) => {
    if (!student) return;
    setAiSkillLevel(level);
    const opening = aiLevelOpening(student.name, level);
    setTutorChat([{ role: 'assistant', content: opening }]);
    void speakTeacherAloud(opening, student.grade, sid).catch(() => undefined);
  };

  const genPaper = async () => {
    if (!['math', 'chinese', 'english'].includes(sid)) {
      toast.message('只有语文、数学、英语老师可以出卷');
      return;
    }
    if (!canUseFullTeacherTools()) {
      toast.error(accessBlockMessage('teacher'));
      return;
    }
    setBusy(true);
    try {
      const topic = paperTopic.trim() || assessment?.weaknesses?.[0] || '本周综合';
      const text = await subjectChat({
        prefer,
        temperature: 0.55,
        max_tokens: 3500,
        system: withAgeBand(
          `你是${teacher.persona}。请生成一套适合该年龄段的「${activeTrackLabel}」小试卷（8-10题）。
结构：标题、考试说明、大题分区、每题分值、文末附【参考答案与简析】。
${trackPromptBlock(sid, track)}
可用 Markdown。知识库：${combinedKb}`,
          student.ageBand,
          teacherTone,
          { role: 'teacher', student },
        ),
        user: `分科：${activeTrackLabel}。主题/范围：${topic}。测评得分：${assessment?.score ?? '未测'}。弱项：${assessment?.weaknesses?.join('、') || '综合'}。`,
      });
      setPaperText(text);
      toast.success('试卷已生成（DeepSeek / Kimi）');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '出卷失败');
    } finally {
      setBusy(false);
    }
  };

  const loadMaterials = async () => {
    if (!canUseFullTeacherTools()) {
      toast.error(accessBlockMessage('teacher'));
      return;
    }
    setBusy(true);
    try {
      const pack = await fetchLatestMaterials({
        subject: sid,
        subjectName: meta?.name || sid,
        teacherName: teacher.name,
        topic: materialsTopic.trim() || assessment?.weaknesses?.[0] || '今日重点',
        ageBand: student.ageBand,
        gradeLabel: bandLabel(student.ageBand),
        weaknesses: assessment?.weaknesses,
        teacherTone,
        trackLabel: activeTrackLabel,
      });
      setMaterials(pack);
      setTab('materials');
      toast.success(
        `已用 ${pack.engine === 'deepseek' ? 'DeepSeek' : 'Kimi'} 整理最新资料（下次自动换引擎）`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '资料搜索失败');
    } finally {
      setBusy(false);
    }
  };

  const isMajorSubject = ['math', 'chinese', 'english'].includes(sid);

  const tabs: Array<{ id: Tab; label: string }> = isMajorSubject
    ? [
        { id: 'tutor', label: '老师辅导' },
        { id: 'materials', label: '最新资料' },
        { id: 'paper', label: '生成试卷' },
        { id: 'assess', label: '学情测评' },
        { id: 'profile', label: '学情档案' },
        { id: 'tasks', label: '今日任务' },
        { id: 'practice', label: '练习题' },
        { id: 'wrong', label: '错题本' },
        { id: 'report', label: '学习报告' },
      ]
    : [
        // 科学 / 艺术 / 体育 / AI：只保留核心五项（科学实验室入口仍在上方快捷按钮 → /lab）
        { id: 'tutor', label: '老师辅导' },
        { id: 'materials', label: '最新资料' },
        { id: 'assess', label: '学情测评' },
        { id: 'profile', label: '学情档案' },
        { id: 'tasks', label: '今日任务' },
      ];

  if (!meta) {
    return (
      <Shell title="未知教学楼" sceneSrc={SCENES.campus}>
        <Card>
          <p>找不到该学科</p>
          <Link to="/" className="text-campus-mint font-bold text-sm mt-2 inline-block">
            返回校园
          </Link>
        </Card>
      </Shell>
    );
  }

  const videoItems: SchoolSearchItem[] = (materials?.items || []).filter(
    (it) => it.source === 'video' || /bilibili|youtube|youtu\.be/i.test(it.url),
  );
  const otherItems: SchoolSearchItem[] = (materials?.items || []).filter((it) => !videoItems.includes(it));

  return (
    <Shell
      title={`${meta.name} · ${teacher.name}`}
      sceneSrc={scene}
      sceneOverlay={sid === 'ai' ? 'rgba(255, 236, 210, 0.38)' : undefined}
    >
      <Card className="mb-3">
        <TeacherAgentCard
          teacher={teacher}
          subjectName={meta.name}
          subjectId={sid}
          gradeYear={resolveGradeYear(student)}
          greeting={greeting}
          onSpeak={speakGreetingOrLast}
          teacherTone={teacherTone}
          onToneChange={(t) => {
            setParent({ teacherTone: t });
            toast.success(`老师说话方式：${TEACHER_TONE_OPTIONS.find((o) => o.id === t)?.label}`);
          }}
        />
        {!canUseFullTeacherTools() && (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            试用期老师功能受限：每日辅导 {getGuestTutorCount()}/{GUEST_TUTOR_LIMIT} 次；出卷与最新资料需
            <Link to="/login" className="font-bold underline mx-1">
              登录手机号
            </Link>
            解锁。
          </div>
        )}
        {subjectTracks.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-campus-ink/50">本课分科</span>
            {subjectTracks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTrack(t.id);
                  setLabExpId(null);
                  toast.message(`切换到「${t.label}」`);
                }}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold border transition ${
                  track === t.id
                    ? 'bg-campus-mint text-white border-campus-mint'
                    : 'bg-white border-campus-ink/10 hover:border-campus-mint/40'
                }`}
                title={t.blurb}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        {sid === 'science' && (
          <div className="mb-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  unlockFreeLab(FREE_LAB_MS);
                  toast.success('科学课结束：已开放 30 分钟自由实验室');
                }}
                className="rounded-full px-3 py-1.5 text-[11px] font-bold bg-violet-600 text-white hover:bg-violet-500"
              >
                下课并开放自由实验（30 分钟）
              </button>
              <Link
                to="/lab"
                className="rounded-full px-3 py-1.5 text-[11px] font-bold border border-violet-300 text-violet-800 bg-violet-50"
              >
                进入自由实验室
                {freeLabUntil && new Date(freeLabUntil).getTime() > Date.now() ? ' · 进行中' : ''}
              </Link>
            </div>
            {labMission && labMission.phase !== 'done' && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-[11px] text-emerald-950 leading-relaxed">
                <span className="font-black">阿科老师 · 实验室任务 </span>
                {labMission.phase === 'await_ack' && '先听清观察问题，回复「明白了」后开门禁'}
                {labMission.phase === 'open' &&
                  `权限开放中${labMission.until ? ` · 截止 ${new Date(labMission.until).toLocaleTimeString()}` : ''}：请去实验室观察`}
                {labMission.phase === 'reflect' && '时间到/已返回 · 请向老师汇报你发现了什么'}
                <div className="mt-1 text-emerald-900/80">观察问题：{labMission.question}</div>
              </div>
            )}
          </div>
        )}
        {principalIntake && (
          <div className="mb-3 rounded-2xl border border-campus-mint/20 bg-campus-mint/5 px-3 py-2 text-[11px] text-campus-ink/75 leading-relaxed">
            <span className="font-bold text-campus-mint">校长下发的入学方案 · </span>
            薄弱：{principalIntake.weaknesses.slice(0, 3).join('、') || '—'}
            {principalIntake.stagnant.length
              ? `；停滞：${principalIntake.stagnant.slice(0, 2).join('、')}`
              : ''}
            。请优先完成本科「今日任务」。
          </div>
        )}
        {edition && ['chinese', 'math', 'english'].includes(sid) && (
          <div className="mb-3 rounded-2xl border border-sky-200/60 bg-sky-50/80 px-3 py-2 text-[11px] text-campus-ink/75">
            <span className="font-bold text-sky-700">教材版本 · </span>
            {editionLabel(edition)}
            {edition.officialEntry ? (
              <>
                {' '}
                ·{' '}
                <a
                  href={edition.officialEntry}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-sky-700"
                >
                  官方入口
                </a>
              </>
            ) : null}
          </div>
        )}
        {iqeResult && (
          <div className="mb-3 rounded-2xl border border-violet-200/50 bg-violet-50/70 px-3 py-2 text-[11px] text-campus-ink/75">
            <span className="font-bold text-violet-700">多维画像 · </span>
            {iqeResult.personality}
            {' · '}
            逻辑 {iqeResult.iq.LOGIC} / 语言 {iqeResult.iq.LANG} / 空间 {iqeResult.iq.SPACE}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-campus-ink/8">
          <span className="text-xs font-bold text-campus-ink/60">AI 引擎</span>
          {(
            [
              ['auto', '自动（DeepSeek→Kimi）'],
              ['deepseek', 'DeepSeek'],
              ['kimi', 'Kimi'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAiEngine(id)}
              className={`rounded-full px-3 py-1 text-xs font-bold border ${
                aiEngine === id ? 'bg-campus-mint text-white border-campus-mint' : 'bg-white border-campus-ink/10'
              }`}
            >
              {label}
            </button>
          ))}
          <PrimaryButton className="ml-auto text-xs !py-1.5" disabled={busy} onClick={() => void loadMaterials()}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            搜最新资料
          </PrimaryButton>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold border ${
              tab === t.id ? 'bg-campus-mint text-white border-campus-mint' : 'bg-white/85 border-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tutor' && (
        <Card className="min-h-[420px] flex flex-col">
          <div className="font-bold mb-1">与 {teacher.name} 对话</div>
          <p className="text-xs text-campus-ink/55 mb-3">
            一对一辅导 · 老师 Agent 在线
            {activeTrackLabel ? ` · 当前分科「${activeTrackLabel}」` : ''}
          </p>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[48vh] mb-3 rounded-2xl bg-campus-cream/40 p-3">
            {tutorChat.length === 0 && (
              <div className="rounded-2xl bg-white/90 px-3 py-3 text-sm mr-4 border border-white shadow-sm">
                <div className="text-xs font-bold text-campus-mint mb-1">{teacher.name}</div>
                <p>{greeting}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {sid === 'ai' && !aiSkillLevel ? (
                    <div className="w-full flex flex-col gap-2">
                      {AI_SKILL_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className="text-left rounded-xl px-3 py-2.5 border border-cyan-200 bg-cyan-50/60 hover:border-cyan-400 hover:bg-cyan-50 transition"
                          onClick={() => pickAiLevel(opt.id)}
                        >
                          <div className="text-sm font-bold text-campus-ink">{opt.label}</div>
                          <div className="text-[11px] text-campus-ink/55 mt-0.5">{opt.blurb}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    (
                      sid === 'ai'
                        ? ['这段代码怎么改', '报错贴给你，直接给修法', '帮我写一版可用提示词']
                        : sid === 'science'
                          ? ['老师，能暂时打开实验室吗', '带我做个电路实验', '光合作用怎么做实验']
                          : sid === 'chinese'
                            ? ['讲解这篇阅读', '历史时间线理一理', '这幅地图怎么读']
                            : ['这道题我不会', '讲解今天的弱项', '帮我搜教学视频']
                    ).map((hint) => (
                      <button
                        key={hint}
                        type="button"
                        className="text-xs rounded-full px-2.5 py-1 border bg-white hover:border-campus-mint"
                        onClick={() => setTutorInput(hint)}
                      >
                        {hint}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
            {tutorChat.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-campus-mint/15 ml-6' : 'bg-white mr-4 border border-white shadow-sm'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="text-[10px] font-bold text-campus-mint mb-1">{teacher.name}</div>
                )}
                {m.role === 'assistant' ? (
                  <SpeakableBlock text={m.content} kind={readKind} subject={sid}>
                    <MarkdownLite text={m.content} />
                  </SpeakableBlock>
                ) : (
                  <MarkdownLite text={m.content} />
                )}
              </div>
            ))}
            {busy && tutorChat.length > 0 && tutorChat[tutorChat.length - 1]?.role === 'user' && (
              <div className="text-xs text-campus-ink/50 flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {teacher.name} 正在思考…
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={tutorInput}
              onChange={(e) => setTutorInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void askTutor()}
              disabled={sid === 'ai' && !aiSkillLevel}
              className="flex-1 rounded-2xl border px-3 py-2 bg-white disabled:opacity-60"
              placeholder={
                sid === 'ai' && !aiSkillLevel
                  ? '先选择上方的 AI 水平…'
                  : `向${teacher.name}提问…`
              }
            />
            <PrimaryButton
              disabled={busy || !tutorInput.trim() || (sid === 'ai' && !aiSkillLevel)}
              onClick={() => void askTutor()}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </PrimaryButton>
          </div>
        </Card>
      )}

      {tab === 'lab' && sid === 'science' && (
        <Card>
          <div className="font-bold text-lg mb-1">虚拟实验室 · {activeTrackLabel}</div>
          {labMission?.phase === 'reflect' ||
          (labMission?.phase === 'open' &&
            labMission.until &&
            new Date(labMission.until).getTime() <= Date.now()) ? (
            <div className="text-center py-8 px-2">
              <div className="text-4xl mb-3" aria-hidden>
                ⏰
              </div>
              <p className="text-base font-black text-campus-ink leading-relaxed">
                实验时间已经到期了，快去找老师分享本次实验结果吧！
              </p>
              <p className="text-xs text-campus-ink/60 mt-2">实验室内容已锁定，请先切换到「老师辅导」汇报发现。</p>
              <PrimaryButton className="mt-4 text-sm" onClick={() => setTab('tutor')}>
                去向阿科老师汇报 →
              </PrimaryButton>
            </div>
          ) : (
            <>
              <p className="text-xs text-campus-ink/60 mb-3 leading-relaxed">
                课堂实验练习（科学 / 物理 / 化学 / 生物）。下课后点「下课并开放自由实验」可去自由实验室任选项目，时限约 30 分钟。
              </p>
              {labExpId && getLabById(labExpId) ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    className="text-xs font-bold text-violet-700"
                    onClick={() => setLabExpId(null)}
                  >
                    ← 返回实验列表
                  </button>
                  <ScienceLabWorkbench
                    experiment={getLabById(labExpId)!}
                    onComplete={(id) => {
                      markLabCompleted(id);
                      toast.success('课堂实验完成（+5 积分）');
                    }}
                  />
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {labsForTrack(
                    (track === 'default' ? 'science' : track) as ScienceTrack,
                    student.ageBand,
                  )
                    .concat(
                      labsForTrack((track === 'default' ? 'science' : track) as ScienceTrack).filter(
                        (e) => !e.bands.includes(student.ageBand),
                      ),
                    )
                    .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
                    .map((exp) => (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => setLabExpId(exp.id)}
                        className="text-left rounded-2xl border border-violet-100 bg-violet-50/40 hover:border-violet-400 px-3 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{exp.emoji}</span>
                          <div>
                            <div className="font-bold text-sm">{exp.title}</div>
                            <div className="text-[10px] text-campus-ink/50">{exp.topic}</div>
                          </div>
                        </div>
                        <p className="text-[11px] text-campus-ink/60 mt-1 line-clamp-2">{exp.goal}</p>
                      </button>
                    ))}
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {tab === 'materials' && (
        <Card>
          <div className="font-bold text-lg">最新学习资料（可观看）</div>
          <p className="text-sm text-campus-ink/65 mt-1">
            DeepSeek 与 Kimi 轮番上网检索并整理 B站 / YouTube 等真实链接。
          </p>
          <input
            value={materialsTopic}
            onChange={(e) => setMaterialsTopic(e.target.value)}
            className="mt-3 w-full rounded-xl border px-3 py-2"
            placeholder="主题，如：分数加减、古诗、一般现在时…"
          />
          <PrimaryButton className="mt-3" disabled={busy} onClick={() => void loadMaterials()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {materials ? '换引擎再搜一轮' : '开始搜索'}
          </PrimaryButton>

          {materials && (
            <div className="mt-4 space-y-4">
              <div className="text-xs text-campus-mint font-bold">
                本轮引擎：{materials.engine === 'deepseek' ? 'DeepSeek' : 'Kimi'} · 查询「{materials.query}」
              </div>
              <div className="rounded-2xl border bg-white p-4 text-sm">
                <SpeakableBlock text={materials.summary} kind={readKind} subject={sid}>
                  <MarkdownLite text={materials.summary} />
                </SpeakableBlock>
              </div>
              {(videoItems.length > 0 || otherItems.length > 0) && (
                <div>
                  <div className="font-bold text-sm mb-2">点击打开观看</div>
                  <ul className="space-y-2">
                    {[...videoItems, ...otherItems].slice(0, 10).map((it) => (
                      <li key={it.url}>
                        <a
                          href={it.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 rounded-2xl border bg-campus-cream/50 px-3 py-2 text-sm hover:border-campus-mint"
                        >
                          <ExternalLink className="w-4 h-4 shrink-0 mt-0.5 text-campus-mint" />
                          <span className="min-w-0">
                            <span className="font-bold block truncate">{it.title}</span>
                            <span className="text-xs text-campus-ink/55 line-clamp-2">{it.snippet || it.url}</span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {tab === 'paper' && ['math', 'chinese', 'english'].includes(sid) && (
        <Card>
          <div className="font-bold text-lg">AI 生成试卷</div>
          <p className="text-sm text-campus-ink/65 mt-1">仅语数英老师可出卷；根据学情与主题出卷，答案附在文末。</p>
          <input
            value={paperTopic}
            onChange={(e) => setPaperTopic(e.target.value)}
            className="mt-3 w-full rounded-xl border px-3 py-2"
            placeholder="试卷主题，如：分数加减、古诗阅读、一般现在时…"
          />
          <PrimaryButton className="mt-3" disabled={busy} onClick={() => void genPaper()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            生成试卷
          </PrimaryButton>
          {paperText && (
            <div className="mt-4 rounded-2xl border bg-white p-4 text-sm max-h-[55vh] overflow-y-auto">
              <SpeakableBlock text={paperText} kind={readKind} subject={sid}>
                <MarkdownLite text={paperText} />
              </SpeakableBlock>
            </div>
          )}
        </Card>
      )}

      {tab === 'assess' && (
        <Card>
          <h3 className="font-bold text-lg">首次学情测评（{bank.length} 题）</h3>
          <p className="text-sm text-campus-ink/65 mt-1">答完后老师会生成学情分析，并回到对话界面。</p>
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
          <PrimaryButton className="mt-4" disabled={busy} onClick={() => void submitAssessment()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            提交测评
          </PrimaryButton>
        </Card>
      )}

      {tab === 'profile' && (
        <Card>
          {!assessment?.done ? (
            <p>
              还没测评，先去做{' '}
              <button type="button" className="text-campus-mint font-bold" onClick={() => setTab('assess')}>
                学情测评
              </button>
              。
            </p>
          ) : (
            <>
              <div className="font-display text-xl">得分 {assessment.score}</div>
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <div className="rounded-2xl bg-green-50 p-3">
                  <div className="font-bold text-green-700">强项</div>
                  <div className="text-sm mt-1">{(assessment.strengths || []).join('、') || '—'}</div>
                </div>
                <div className="rounded-2xl bg-orange-50 p-3">
                  <div className="font-bold text-orange-700">弱项</div>
                  <div className="text-sm mt-1">{(assessment.weaknesses || []).join('、') || '—'}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="font-bold mb-2">知识点掌握</div>
                {Object.entries(assessment.mastery || {}).map(([k, v]) => (
                  <div key={k} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{k}</span>
                      <span>{v > 0 ? '较稳' : '待加强'}</span>
                    </div>
                    <div className="h-2 rounded-full bg-campus-ink/10 overflow-hidden">
                      <div
                        className="h-full bg-campus-mint"
                        style={{ width: `${Math.min(100, v * 50 + (assessment.score > 70 ? 40 : 20))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <PrimaryButton className="mt-4" disabled={busy} onClick={() => void genPlan()}>
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
              <PrimaryButton className="mt-3" disabled={busy || !assessment?.done} onClick={() => void genPlan()}>
                AI 生成方案
              </PrimaryButton>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-campus-ink/60">日期 {plan.date}</div>
              {(plan.tasks || []).map((t) => (
                <label key={t.id} className="flex items-center gap-3 rounded-2xl bg-campus-cream/60 px-3 py-3">
                  <input type="checkbox" checked={!!t.done} onChange={() => toggleTask(sid, t.id)} />
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

      {tab === 'practice' && isMajorSubject && (
        <Card>
          <a href="/ops" className="block text-sm underline mb-4">本地单元练习 · 掌握后解锁下一单元 →</a><div className="flex gap-2 mb-3">
            <PrimaryButton disabled={busy} onClick={() => void nextPractice()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              AI 出题
            </PrimaryButton>
          </div>
          {practiceQ ? (
            <>
              <div className="rounded-2xl bg-campus-cream/70 p-4">
                <div className="text-xs text-campus-ink/60 mb-1">知识点：{practiceQ.knowledge}</div>
                <SpeakableBlock text={practiceQ.question} kind={readKind} subject={sid}>
                  <MarkdownLite text={practiceQ.question} />
                </SpeakableBlock>
              </div>
              <input
                value={userAns}
                onChange={(e) => setUserAns(e.target.value)}
                disabled={Boolean(feedback)}
                onBlur={() => { if (userAns && revisions.at(-1)?.answer !== userAns) setRevisions(prev => [...prev, { answer: userAns, at: new Date().toISOString() }]); }}
                className="mt-3 w-full rounded-xl border px-3 py-2"
                placeholder="写下你的答案"
              />
              <label className="block text-sm mt-3">我的推理过程<textarea className="block mt-2 w-full rounded-xl border p-3" value={reasoning} disabled={Boolean(feedback)} onChange={e => setReasoning(e.target.value)} placeholder="我先想到什么？哪一步还不确定？" /></label>
              <PrimaryButton className="mt-3" disabled={busy || Boolean(feedback) || !userAns.trim() || !reasoning.trim()} onClick={() => void gradePractice()}>
                提交判分
              </PrimaryButton>
              {feedback && (
                <div className="mt-3 rounded-2xl bg-white border p-3 text-sm">
                  <SpeakableBlock text={feedback} kind={readKind} subject={sid}>
                    <MarkdownLite text={feedback} />
                  </SpeakableBlock>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-campus-ink/65">点「AI 出题」开始练习。</p>
          )}
        </Card>
      )}

      {tab === 'wrong' && isMajorSubject && (
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
                  <p className="text-sm mt-2 text-amber-800">{w.cause || '待验证：旧记录缺少推理，请重练补充证据。'}</p>
                  <div className="text-sm text-campus-ink/70 mt-1">{w.explanation}</div>
                  <PrimaryButton
                    className="mt-2"
                    onClick={async () => {
                      await nextPractice(w.knowledge, w.id);
                    }}
                  >
                    重练同类
                  </PrimaryButton>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'report' && isMajorSubject && (
        <Card>
          <h3 className="font-bold text-lg">学习报告</h3><a className="text-sm underline" href="/ops?tab=report">查看纵向掌握度与项目报告 →</a>
          <ul className="mt-3 text-sm space-y-1">
            <li>练习次数：{practices.length}</li>
            <li>
              正确率：
              {practices.length ? Math.round((practices.filter((p) => p.correct).length / practices.length) * 100) : 0}%
            </li>
            <li>错题数：{wrongBook.length}</li>
            <li>测评得分：{assessment?.score ?? '未测评'}</li>
            <li>弱项：{(assessment?.weaknesses || []).join('、') || '—'}</li>
          </ul>
        </Card>
      )}
    </Shell>
  );
}
