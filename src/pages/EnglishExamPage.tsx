import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PrimaryButton } from '@/components/ui';
import { useSchoolStore } from '@/store/school';
import { yearToGradeKey } from '@/lib/grade-speak';
import { speakAloud, stopReadAloud } from '@/lib/read-aloud';
import {
  ENGLISH_BANDS,
  IELTS_ITEMS,
  SKILL_LABELS,
  bandById,
  countWords,
  gradeEnglishExam,
  gradeItem,
  loadEnglishExam,
  newSkillProgress,
  nextIeltsItem,
  nextItemForSkill,
  saveEnglishExam,
  shouldAdministerIelts,
  startBandForGrade,
  type EnglishBandId,
  type EnglishExamReport,
  type EnglishItem,
  type EnglishSkill,
  type SkillProgress,
  type StoredEnglishExam,
} from '@/lib/english-assessment';

const SKILL_ORDER: EnglishSkill[] = ['listening', 'speaking', 'reading', 'writing'];
const field =
  'w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600';

type ProgressMap = Record<EnglishSkill, SkillProgress>;

function freshProgress(): ProgressMap {
  return {
    listening: newSkillProgress('listening'),
    speaking: newSkillProgress('speaking'),
    reading: newSkillProgress('reading'),
    writing: newSkillProgress('writing'),
  };
}

function Bar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-slate-500">{value} / 100</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-600"
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function EnglishExamPage() {
  const state = useSchoolStore();
  const student = state.student;

  const [phase, setPhase] = useState<'intro' | 'exam' | 'report'>('intro');
  const [progress, setProgress] = useState<ProgressMap>(freshProgress);
  const [examId, setExamId] = useState<string>('');
  const [report, setReport] = useState<EnglishExamReport | null>(null);
  const [value, setValue] = useState('');
  const [capture, setCapture] = useState<'asr' | 'typed'>('asr');
  const [playsLeft, setPlaysLeft] = useState(2);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [asrSupported, setAsrSupported] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<{ score: number; detail: string[]; note?: string } | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const asrRef = useRef<any>(null);
  const finalTranscript = useRef('');
  const itemStartedAt = useRef<number>(Date.now());

  const gradeYear = student?.gradeYear ?? 3;
  const startBand = startBandForGrade(gradeYear);

  // 恢复存档
  useEffect(() => {
    if (!student) return;
    const saved = loadEnglishExam(student.id);
    if (saved) {
      setProgress(saved.progress);
      setExamId(saved.examId);
      if (saved.report) {
        setReport(saved.report);
        setPhase('report');
      }
    }
  }, [student?.id]);

  useEffect(() => {
    const w = window as any;
    setAsrSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => {
      stopReadAloud();
      try {
        asrRef.current?.stop?.();
        recorderRef.current?.stop?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const adaptiveSkill = useMemo(
    () => SKILL_ORDER.find((s) => nextItemForSkill(progress[s], startBand) !== null) || null,
    [progress, startBand],
  );
  const currentItem = useMemo(() => {
    if (adaptiveSkill) return nextItemForSkill(progress[adaptiveSkill], startBand);
    if (shouldAdministerIelts(progress, startBand)) return nextIeltsItem(progress);
    return null;
  }, [adaptiveSkill, progress, startBand]);

  useEffect(() => {
    setValue('');
    setPlaysLeft(2);
    setLastScore(null);
    setAudioUrl(null);
    setCapture(asrSupported ? 'asr' : 'typed');
    finalTranscript.current = '';
    itemStartedAt.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem?.id]);

  if (!student) return null;

  const persist = (nextProgress: ProgressMap, nextReport?: EnglishExamReport) => {
    const payload: StoredEnglishExam = {
      version: 1,
      examId: examId || crypto.randomUUID(),
      gradeYear,
      progress: nextProgress,
      completedAt: nextReport?.completedAt,
      report: nextReport,
    };
    if (!examId) setExamId(payload.examId);
    saveEnglishExam(student.id, payload);
  };

  const begin = () => {
    const id = crypto.randomUUID();
    const p = freshProgress();
    setExamId(id);
    setProgress(p);
    setReport(null);
    setPhase('exam');
    saveEnglishExam(student.id, { version: 1, examId: id, gradeYear, progress: p });
  };

  const playAudio = async (item: EnglishItem) => {
    if (playsLeft <= 0) {
      toast.message('本题播放次数已用完，可以再读一遍题干。');
      return;
    }
    if (!item.audioText) return;
    try {
      setPlaysLeft((n) => n - 1);
      await speakAloud(item.audioText, yearToGradeKey(gradeYear), 'english');
    } catch {
      toast.error('播放失败：本机 TTS 服务不可用，可先读题干作答。');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();

      const w = window as any;
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (SR) {
        const sr = new SR();
        sr.lang = 'en-US';
        sr.continuous = true;
        sr.interimResults = true;
        finalTranscript.current = '';
        sr.onresult = (ev: any) => {
          let interim = '';
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const t = ev.results[i][0].transcript;
            if (ev.results[i].isFinal) finalTranscript.current += t + ' ';
            else interim += t;
          }
          setValue((finalTranscript.current + interim).trim());
          setCapture('asr');
        };
        sr.onerror = () => {
          setCapture('typed');
        };
        sr.start();
        asrRef.current = sr;
      } else {
        setCapture('typed');
      }
      setRecording(true);
    } catch {
      toast.error('无法打开麦克风：请允许浏览器麦克风权限，或先手动输入你说的内容。');
      setCapture('typed');
    }
  };

  const stopRecording = () => {
    try {
      recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    try {
      asrRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    setRecording(false);
    if (finalTranscript.current.trim()) setValue(finalTranscript.current.trim());
  };

  const submitItem = () => {
    if (!currentItem) return;
    const targetSkill = currentItem.skill;
    const answer = value.trim();
    if (!answer) {
      toast.error('先作答再提交。');
      return;
    }
    if (recording) stopRecording();

    const ans = {
      itemId: currentItem.id,
      value: answer,
      capture: currentItem.options?.length ? undefined : capture,
      audioSaved: Boolean(audioUrl),
      durationMs: Date.now() - itemStartedAt.current,
      savedAt: new Date().toISOString(),
    };
    const score = gradeItem(currentItem, ans);
    const p = progress[targetSkill];
    const nextSkillProgress: SkillProgress = {
      ...p,
      bandTrail: [...p.bandTrail, currentItem.band],
      answered: { ...p.answered, [currentItem.id]: ans },
      scores: [...p.scores, score],
    };
    const nextProgress = { ...progress, [targetSkill]: nextSkillProgress };
    setProgress(nextProgress);
    setLastScore({ score: score.score, detail: score.detail, note: score.pronunciationNote });

    const stillHasItem = nextItemForSkill(nextSkillProgress, startBand) !== null;
    const adaptiveDone = SKILL_ORDER.every((s) => nextItemForSkill(nextProgress[s], startBand) === null);
    const ieltsDone = !shouldAdministerIelts(nextProgress, startBand) || nextIeltsItem(nextProgress) === null;
    const allDone = adaptiveDone && ieltsDone;
    persist(nextProgress);

    if (allDone) {
      const r = gradeEnglishExam({ examId: examId || crypto.randomUUID(), gradeYear, progress: nextProgress });
      setReport(r);
      setPhase('report');
      persist(nextProgress, r);
      state.setAssessment({
        subject: 'english',
        done: true,
        strengths: r.strengths,
        weaknesses: r.gaps,
        mastery: {
          listening: r.skills.listening.score,
          speaking: r.skills.speaking.score,
          reading: r.skills.reading.score,
          writing: r.skills.writing.score,
        },
        score: Math.round(
          (r.skills.listening.score + r.skills.speaking.score + r.skills.reading.score + r.skills.writing.score) / 4,
        ),
        completedAt: r.completedAt,
      });
      toast.success('英语入学测评分档完成');
    } else if (!stillHasItem) {
      toast.message(`${SKILL_LABELS[targetSkill]}这一站完成，进入下一站。`);
    }
  };

  // ---------------- 渲染 ----------------

  if (phase === 'intro') {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <p className="text-xs text-slate-500 mb-4">入学流程 · 英语单科测评</p>
          <header className="rounded-3xl bg-[#193c47] text-white p-6 md:p-8">
            <p className="text-xs tracking-widest text-teal-100">OPS / ENGLISH PLACEMENT</p>
            <h1 className="text-3xl font-bold mt-3">英语入学测评：口语、听说、读写</h1>
            <p className="mt-3 text-sm leading-6 text-teal-50">
              不是打分排名，是给你的英语找一个"能开始学"的起点。四项技能各考 1–3 题，答对升档、答错降档，最后给出四档定位与雅思起步判断。
            </p>
            <p className="text-xs mt-4 text-teal-100">
              当前年级：{student.gradeYear ?? '未填'} 年级 · 起始档位：{bandById(startBand).label}（{bandById(startBand).gradeLabel}）
            </p>
          </header>

          <section className="rounded-3xl bg-white p-6 mt-5">
            <h2 className="font-bold text-xl">四个档位</h2>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {ENGLISH_BANDS.map((b) => (
                <div
                  key={b.id}
                  className={`rounded-2xl border p-4 ${b.id === startBand ? 'border-teal-500 bg-teal-50' : 'border-slate-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{b.label}</span>
                    <span className="text-xs text-slate-500">{b.cefr}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{b.gradeLabel}</p>
                  <p className="text-sm mt-2 leading-6">{b.summary}</p>
                  {b.id === startBand && <p className="text-xs text-teal-700 mt-2">← 你的起始档位</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 mt-5">
            <h2 className="font-bold text-xl">测评怎么进行</h2>
            <ul className="text-sm mt-3 space-y-2 list-disc pl-5 text-slate-700">
              <li>听力：听两遍音频，选答案。</li>
              <li>口语：麦克风录音 + 浏览器识别转写；识别不可用时可以手动输入你说的内容。</li>
              <li>阅读：读短文选答案。</li>
              <li>写作：按题写短文，满词数后提交。</li>
              <li>
                雅思预备 / 高级档会额外做雅思风格四单项，判断"是否具备开始真题练习的水平"。
              </li>
            </ul>
            <p className="text-xs text-amber-800 bg-amber-50 rounded-xl p-3 mt-4">
              诚实说明：浏览器只能把语音转成文字，<b>不能给发音打音素级分数</b>。所以口语分只计算信息覆盖、句法、词汇与衔接；发音维度会单独标注，留给老师听录音复核。口语与写作是开放题，一题即代表一档，因此<b>需 75 分以上才算通过该档</b>；只有一题证据的档位会在报告里提示复测。
            </p>
            <div className="flex gap-3 flex-wrap mt-5">
              <PrimaryButton onClick={begin}>{report ? '重新测一次' : '开始英语测评'}</PrimaryButton>
              {report && (
                <button
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
                  onClick={() => {
                    setPhase('report');
                  }}
                >
                  查看上次报告
                </button>
              )}
              <Link className="rounded-xl border border-slate-300 px-4 py-2 text-sm" to="/assessment">
                返回综合入学测评
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (phase === 'report' && report) {
    const r = report;
    return (
      <main className="min-h-screen bg-slate-100 text-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-5">
          <header className="rounded-3xl bg-[#193c47] text-white p-6 md:p-8">
            <p className="text-xs tracking-widest text-teal-100">OPS / ENGLISH PLACEMENT REPORT</p>
            <h1 className="text-3xl font-bold mt-3">
              英语起点：{bandById(r.overallBand).label} · {bandById(r.overallBand).cefr}
            </h1>
            <p className="mt-2 text-sm text-teal-50">
              {r.gradeYear} 年级 · 四档定位以四项中最低一项为准（保守口径）
            </p>
            <p className="mt-2 text-xs text-teal-100">{bandById(r.overallBand).summary}</p>
          </header>

          <section className="rounded-3xl bg-white p-6">
            <h2 className="font-bold text-xl mb-4">四项技能</h2>
            {SKILL_ORDER.map((s) => {
              const sk = r.skills[s];
              return (
                <div key={s} className="mb-5">
                  <Bar
                    label={`${sk.label} · 到达 ${bandById(sk.bandReached).label}`}
                    value={sk.score}
                    hint={`${bandById(sk.bandReached).gradeLabel} · 已考 ${sk.attempted} 题`}
                  />
                </div>
              );
            })}
            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">口语</p>
                <p className="text-2xl font-bold mt-1">{r.clusters.speaking}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">听说</p>
                <p className="text-2xl font-bold mt-1">{r.clusters.listeningSpeaking}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">读写</p>
                <p className="text-2xl font-bold mt-1">{r.clusters.readingWriting}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6">
            <h2 className="font-bold text-xl mb-2">雅思起步判断</h2>
            {!r.ielts.administered ? (
              <p className="text-sm text-slate-600">
                本次未进入雅思预备档，未启动雅思四单项判定。{r.ielts.suggestion}
              </p>
            ) : (
              <>
                <div className="grid sm:grid-cols-4 gap-3 mt-3">
                  {(['listening', 'reading', 'writing', 'speaking'] as const).map((k) => (
                    <div key={k} className="rounded-2xl border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">{k}</p>
                      <p className="text-xl font-bold">{r.ielts.subscores[k] ?? '未测'}</p>
                    </div>
                  ))}
                </div>
                <p className={`mt-4 rounded-xl p-4 text-sm ${r.ielts.ready ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
                  <b>{r.ielts.ready ? '已具备开始真题练习的水平' : '暂不具备直接刷真题的水平'}</b>
                  <br />
                  {r.ielts.suggestion}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  判定阈值（教研建议初值）：听力≥65、阅读≥65、写作≥60、口语≥60；估计区间 IELTS {r.ielts.bandEstimate}。阈值可调，改动需记录理由。
                </p>
              </>
            )}
          </section>

          <section className="rounded-3xl bg-white p-6">
            <h2 className="font-bold text-xl">下一步</h2>
            <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-slate-700">
              {r.nextSteps.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
            {r.strengths.length > 0 && (
              <p className="text-sm mt-4 text-emerald-800">当前较稳：{r.strengths.join('、')}</p>
            )}
            {r.gaps.length > 0 && <p className="text-sm mt-1 text-amber-800">优先补：{r.gaps.join('、')}</p>}
            <p className="text-xs text-slate-500 mt-4">
              发音维度未计入分数（浏览器无法做声学评分）。录音留存在本机，可由老师复核后再补注。
            </p>
            <div className="flex gap-3 flex-wrap mt-5">
              <PrimaryButton onClick={begin}>重新测一次</PrimaryButton>
              <Link className="rounded-xl border border-slate-300 px-4 py-2 text-sm" to="/hall/english">
                去英语楼开始学习
              </Link>
              <Link className="rounded-xl border border-slate-300 px-4 py-2 text-sm" to="/assessment">
                返回综合入学测评
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // phase === 'exam'
  const item = currentItem;
  if (!item) return null;
  const isWriting = item.skill === 'writing';
  const isSpeaking = item.skill === 'speaking';
  const hasAudio = Boolean(item.audioText);
  const words = countWords(value);
  const stationIndex = SKILL_ORDER.indexOf(item.skill) + 1;
  const isIeltsItem = Boolean(item.ieltsSkill);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-xs text-slate-500 mb-4">
          英语单科测评 · 第 {stationIndex}/4 站：{SKILL_LABELS[item.skill]} · 档位：{bandById(item.band).label}
          {isIeltsItem && ' · 雅思能力判定'}
        </p>

        <section className="rounded-3xl bg-white p-5 md:p-7" data-item-id={item.id} data-item-skill={item.skill} data-item-band={item.band}>
          <div className="flex justify-between gap-3 flex-wrap text-xs text-slate-500">
            <span>{bandById(item.band).gradeLabel}</span>
            <span>{item.skill === 'listening' ? '听力' : item.skill === 'reading' ? '阅读' : isWriting ? '写作' : '口语'}</span>
          </div>

          <p className="rounded-2xl bg-sky-50 p-4 mt-4 text-sm leading-6">{item.instruction}</p>

          {hasAudio && (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <PrimaryButton disabled={playsLeft <= 0} onClick={() => void playAudio(item)}>
                播放音频（剩余 {playsLeft} 次）
              </PrimaryButton>
              <span className="text-xs text-slate-500">语速由本机 TTS 控制；可先读题干。</span>
            </div>
          )}

          {item.passage && (
            <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm leading-7 whitespace-pre-wrap">
              {item.passage}
            </div>
          )}

          {hasAudio && !item.passage && !item.question.includes('Write') && playsLeft < 2 && (
            <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-xs text-slate-600">
              <p className="font-medium mb-1">音频文稿（播放后可对照）</p>
              <p className="leading-6">{item.audioText}</p>
            </div>
          )}

          <h3 className="text-lg font-bold mt-5">{item.question}</h3>

          {item.options ? (
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              {item.options.map((op) => (
                <button
                  key={op}
                  onClick={() => setValue(op)}
                  aria-pressed={value === op}
                  className={`text-left rounded-xl border p-4 text-sm ${
                    value === op ? 'border-teal-600 bg-teal-50' : 'border-slate-200'
                  }`}
                >
                  {op}
                </button>
              ))}
            </div>
          ) : isSpeaking ? (
            <div className="mt-3">
              <div className="flex gap-3 flex-wrap items-center">
                {!recording ? (
                  <PrimaryButton onClick={() => void startRecording()}>开始录音</PrimaryButton>
                ) : (
                  <PrimaryButton onClick={stopRecording}>停止录音并转写</PrimaryButton>
                )}
                <span className="text-xs text-slate-500">
                  {asrSupported ? '识别语言：English (en-US)' : '当前浏览器不支持语音识别，请手动输入'}
                </span>
              </div>
              {audioUrl && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <audio controls src={audioUrl} className="w-full" />
                  <a className="text-xs text-teal-700 underline" href={audioUrl} download={`${item.id}.webm`}>
                    下载本次录音（供老师复核发音）
                  </a>
                </div>
              )}
              <label className="block mt-3 text-sm">
                你说的英文（可修改）
                <textarea
                  rows={5}
                  className={`${field} mt-2`}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setCapture('typed');
                  }}
                  placeholder="录音后这里会出现转写文本；没有识别结果就自己打出来。"
                />
              </label>
              <p className="text-xs text-slate-500 mt-1">
                词数 {words}
                {item.minWords ? ` / 建议 ≥${item.minWords}` : ''}
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <textarea
                rows={isWriting ? 9 : 5}
                className={field}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={isWriting ? '用英文写你的答案……' : '写下你的答案'}
              />
              <p className="text-xs text-slate-500 mt-1">
                词数 {words}
                {item.minWords ? ` / 建议 ≥${item.minWords}` : ''}
              </p>
            </div>
          )}

          {lastScore && (
            <p className="text-xs text-slate-500 mt-3">
              上一题得分 {lastScore.score} · {lastScore.detail.join('；')}
            </p>
          )}

          <div className="flex gap-3 flex-wrap mt-6">
            <PrimaryButton disabled={!value.trim()} onClick={submitItem}>
              提交本站
            </PrimaryButton>
            <Link className="rounded-xl border border-slate-300 px-4 py-2 text-sm" to="/assessment">
              保存并离开
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            作答自动保存在本机，下次打开可继续。口语题若浏览器不支持识别，可手打你刚说的内容，分数会标注来源为手动转写。
          </p>
        </section>

        <section className="rounded-2xl bg-white p-4 mt-4">
          <p className="text-xs text-slate-500">
            已考：{SKILL_ORDER.map((s) => `${SKILL_LABELS[s]} ${progress[s].scores.length} 题`).join(' · ')}
            {IELTS_ITEMS.length ? ` · 雅思判定题 ${IELTS_ITEMS.length} 道` : ''}
          </p>
        </section>
      </div>
    </main>
  );
}
