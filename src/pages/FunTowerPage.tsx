import { useMemo, useState } from 'react';
import { BookOpen, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { BackButton, Card, MarkdownLite, PrimaryButton, Shell } from '@/components/ui';
import { SpeakableBlock } from '@/components/ReadAloudButton';
import { TalkingTeacherFace } from '@/components/TalkingTeacher';
import { ReadAloudControls } from '@/components/ReadAloudControls';
import { MusicPlayPad } from '@/components/MusicPlayPad';
import { PaintCanvas } from '@/components/PaintCanvas';
import {
  ART_ACTIVITIES,
  ART_GUIDE,
  CLASSIC_WORKS,
  CLASSICS_GUIDE,
  HOW_TO_APPRECIATE_GENERAL,
  INTEREST_ROOMS,
  MUSIC_ACTIVITIES,
  MUSIC_GUIDE,
  type ArtActivity,
  type ClassicWork,
  type InterestRoom,
  type MusicActivity,
} from '@/lib/interest-rooms';
import { schoolChat, withAgeBand } from '@/lib/llm';
import { speakTeacherAloud } from '@/lib/read-aloud';
import { bandLabel } from '@/lib/types';
import { useSchoolStore } from '@/store/school';
import { SCENES } from '@/lib/scenes';
import { GUIDE_THINK_STEPS, guidedThinkPedagogy, type GuideThinkPhase } from '@/lib/teacher-pedagogy';

type ClassicsTab = 'china' | 'world' | 'howto' | 'agent';
type ChatTurn = { role: 'user' | 'assistant'; content: string };

function RoomClosedCard({ room }: { room: InterestRoom }) {
  return (
    <div className="rounded-3xl bg-white/70 border border-dashed border-campus-ink/20 p-4 opacity-80">
      <div className="text-4xl grayscale">{room.emoji}</div>
      <div className="font-bold mt-2 flex items-center gap-2">
        {room.name}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-campus-ink/10 text-campus-ink/55">
          {room.closedHint || '未开放'}
        </span>
      </div>
      <div className="text-xs text-campus-ink/50 mt-1">{room.blurb}</div>
    </div>
  );
}

function ClassicCard({
  work,
  onOpen,
}: {
  work: ClassicWork;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left rounded-2xl border bg-white/95 px-3 py-3 hover:border-campus-mint hover:-translate-y-0.5 transition shadow-sm"
    >
      <div className="flex gap-2 items-start">
        <span className="text-2xl shrink-0">{work.emoji}</span>
        <div className="min-w-0">
          <div className="font-bold text-sm">{work.title}</div>
          <div className="text-[11px] text-campus-ink/50">
            {work.author} · {work.ageHint}
          </div>
          <p className="text-xs text-campus-ink/70 mt-1 line-clamp-2">{work.blurb}</p>
        </div>
      </div>
    </button>
  );
}

function StepIndicator({ phase }: { phase: GuideThinkPhase | null }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {GUIDE_THINK_STEPS.map((s) => (
        <span
          key={s.id}
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            phase === s.id
              ? 'bg-campus-mint text-white border-campus-mint'
              : 'bg-white/80 text-campus-ink/50 border-campus-ink/10'
          }`}
        >
          {s.label}
        </span>
      ))}
    </div>
  );
}

function ClassicsRoom({
  onBack,
}: {
  onBack: () => void;
}) {
  const student = useSchoolStore((s) => s.student)!;
  const teacherTone = useSchoolStore((s) => s.parent?.teacherTone || 'balanced');
  const bumpInterest = useSchoolStore((s) => s.bumpInterest);

  const [tab, setTab] = useState<ClassicsTab>('china');
  const [selected, setSelected] = useState<ClassicWork | null>(null);
  const [phase, setPhase] = useState<GuideThinkPhase | null>(null);
  const [thinkAnswer, setThinkAnswer] = useState('');
  const [whyAnswer, setWhyAnswer] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const china = useMemo(() => CLASSIC_WORKS.filter((w) => w.region === 'china'), []);
  const world = useMemo(() => CLASSIC_WORKS.filter((w) => w.region === 'world'), []);

  const speakGuide = (text: string) => {
    void speakTeacherAloud(text, student.grade, 'chinese').catch((e) => {
      toast.error(e instanceof Error ? e.message : '朗读失败');
    });
  };

  const workContext = (w: ClassicWork) =>
    `【作品】《${w.title}》作者${w.author}
【简介】${w.blurb}
【节选说明】${w.excerptNote || '正文节选'}
【节选正文】
${w.excerpt}
【欣赏提示】${w.howToAppreciate}`;

  const thinkScaffold = (w: ClassicWork) =>
    `读完这段节选，先想一想（可以顺着欣赏方向）：\n${w.howToAppreciate}\n\n支架：先找找——材料里最重要的是哪个人？哪一句话最让你停一下？把你的想法写下来。`;

  const openWork = (w: ClassicWork) => {
    setSelected(w);
    setPhase('material');
    setThinkAnswer('');
    setWhyAnswer('');
    setAnswerText('');
    setChat([]);
    setInput('');
    setTab('agent');
    bumpInterest('literature', 1);
    const intro = `我们先来读《${w.title}》的一段节选。${w.excerptNote ? `（${w.excerptNote}）` : ''}\n\n${w.excerpt}`;
    speakGuide(intro);
  };

  const goThink = () => {
    if (!selected) return;
    setPhase('think');
    speakGuide(thinkScaffold(selected));
  };

  const submitThink = () => {
    const a = thinkAnswer.trim();
    if (!a) {
      toast.message('先写下你的一点想法再继续哦');
      return;
    }
    setPhase('why');
    speakGuide('你为什么会这样想？材料里哪一点让你这么觉得？');
  };

  const submitWhy = async () => {
    const reason = whyAnswer.trim();
    if (!reason || !selected || busy) return;
    setPhase('answer');
    setBusy(true);
    bumpInterest('literature', 1);
    try {
      const reply = await schoolChat({
        temperature: 0.65,
        max_tokens: 2000,
        system: withAgeBand(
          `你是「${CLASSICS_GUIDE.name}」，${CLASSICS_GUIDE.persona}
当前学段：${bandLabel(student.ageBand)}。
学生已经读完【节选正文】，并给出了自己的想法与理由。
${guidedThinkPedagogy({ phase: 'answer', materialKind: 'excerpt' })}
请给出欣赏回答：必须紧扣节选（人物、情节、句子）；肯定学生思考中合理的部分，温和指出可改进处；可在结尾用一两句提「若想每天听读一点后续」作为可选建议（不要当成主流程）；结尾留一个小延伸问题。`,
          student.ageBand,
          teacherTone,
          { role: 'teacher', student },
        ),
        user: `${workContext(selected)}

【学生的思考】${thinkAnswer}
【学生的理由】${reason}
请给出欣赏答案与分析。`,
      });
      setAnswerText(reply);
      setChat([
        { role: 'assistant', content: `（已读节选）《${selected.title}》` },
        { role: 'user', content: `我的想法：${thinkAnswer}` },
        { role: 'user', content: `为什么：${reason}` },
        { role: 'assistant', content: reply },
      ]);
      speakGuide(reply);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '老师暂时忙线');
      const fallback = `你注意到了节选里的细节，很好。再回头听一遍《${selected.title}》这段，抓住最打动你的那一句；想继续时再来找我，我们一起把欣赏说清楚。`;
      setAnswerText(fallback);
      speakGuide(fallback);
    } finally {
      setBusy(false);
    }
  };

  const askAgent = async () => {
    const q = input.trim();
    if (!q || busy) return;
    if (!selected) {
      toast.message('请先选一本故事，小阅老师会按「材料→思考→为什么→答案」带你读哦');
      return;
    }
    setInput('');
    const nextHistory = [...chat, { role: 'user' as const, content: q }];
    setChat(nextHistory);
    setBusy(true);
    bumpInterest('literature', 1);
    try {
      const reply = await schoolChat({
        temperature: 0.7,
        max_tokens: 1800,
        system: withAgeBand(
          `你是「${CLASSICS_GUIDE.name}」，${CLASSICS_GUIDE.persona}
当前学段：${bandLabel(student.ageBand)}。
必须紧扣孩子已选作品的【节选正文】回答；引用或复述节选中的情节/句子；禁止只做空泛书单推荐。
重大剧透需先征得孩子同意。
${guidedThinkPedagogy({ phase: phase || 'answer', materialKind: 'excerpt' })}`,
          student.ageBand,
          teacherTone,
          { role: 'teacher', student },
        ),
        history: nextHistory.slice(-10),
        user: `${workContext(selected)}

【当前阶段】${phase || 'answer'}
【学生先前思考】${thinkAnswer || '（未记录）'}
【学生先前理由】${whyAnswer || '（未记录）'}
学生说：${q}`,
      });
      setChat([...nextHistory, { role: 'assistant', content: reply }]);
      speakGuide(reply);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '老师暂时忙线');
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<{ id: ClassicsTab; label: string }> = [
    { id: 'china', label: '中国名著' },
    { id: 'world', label: '世界名著' },
    { id: 'howto', label: '怎么欣赏' },
    { id: 'agent', label: '小阅带读' },
  ];

  const resetWork = () => {
    setSelected(null);
    setPhase(null);
    setThinkAnswer('');
    setWhyAnswer('');
    setAnswerText('');
    setChat([]);
    setInput('');
  };

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex gap-3 items-start">
          <TalkingTeacherFace
            src={CLASSICS_GUIDE.avatar}
            emoji={CLASSICS_GUIDE.emoji}
            name={CLASSICS_GUIDE.name}
            size={88}
            onClick={() =>
              speakGuide(
                selected && phase === 'material'
                  ? selected.excerpt
                  : selected && answerText
                    ? answerText
                    : selected
                      ? `${selected.title}。${selected.blurb}`
                      : CLASSICS_GUIDE.greeting,
              )
            }
            title="点头像听老师讲解"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-lg">{CLASSICS_GUIDE.name}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-campus-mint/15 text-campus-mint">
                Agent · 四步带读
              </span>
            </div>
            <p className="text-sm text-campus-ink/75 mt-1 leading-relaxed">{CLASSICS_GUIDE.greeting}</p>
            <ReadAloudControls className="mt-2" />
            <BackButton label="返回兴趣室列表" className="!py-1.5 !px-2.5 !text-xs mt-2" onClick={onBack} />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold border transition ${
              tab === t.id
                ? 'bg-campus-mint text-white border-campus-mint'
                : 'bg-white border-campus-ink/10 hover:border-campus-mint/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'china' || tab === 'world') && (
        <div className="grid sm:grid-cols-2 gap-2">
          {(tab === 'china' ? china : world).map((w) => (
            <ClassicCard key={w.id} work={w} onOpen={() => openWork(w)} />
          ))}
        </div>
      )}

      {tab === 'howto' && (
        <Card>
          <div className="font-bold mb-2">名著欣赏小方法</div>
          <SpeakableBlock text={HOW_TO_APPRECIATE_GENERAL} kind="general" subject="chinese">
            <MarkdownLite text={HOW_TO_APPRECIATE_GENERAL} />
          </SpeakableBlock>
          <PrimaryButton className="mt-3" onClick={() => speakGuide(HOW_TO_APPRECIATE_GENERAL)}>
            听老师讲一遍
          </PrimaryButton>
        </Card>
      )}

      {tab === 'agent' && (
        <div className="space-y-3">
          {!selected && (
            <Card>
              <p className="text-sm text-campus-ink/70">
                请先在「中国名著 / 世界名著」里选一本故事。小阅老师会：① 先给节选 → ② 引导思考 → ③ 问为什么 → ④ 给欣赏答案。
              </p>
            </Card>
          )}

          {selected && (
            <Card className="border-campus-mint/30 bg-campus-mint/5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold">
                    {selected.emoji} {selected.title}
                  </div>
                  <div className="text-xs text-campus-ink/55 mt-0.5">
                    {selected.author} · {selected.ageHint}
                  </div>
                </div>
                <button type="button" className="text-[11px] font-bold text-campus-ink/45" onClick={resetWork}>
                  换一本
                </button>
              </div>

              <StepIndicator phase={phase} />

              {/* ① 材料：节选始终可见 */}
              {phase && (
                <div className="mt-3 rounded-2xl bg-white/90 border px-3 py-3">
                  <div className="text-xs font-bold text-campus-mint flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> {selected.excerptNote || '正文节选'}
                  </div>
                  <SpeakableBlock text={selected.excerpt} kind="general" subject="chinese">
                    <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-campus-ink/85">{selected.excerpt}</div>
                  </SpeakableBlock>
                  {phase === 'material' && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <PrimaryButton onClick={() => speakGuide(selected.excerpt)}>再听一遍节选</PrimaryButton>
                      <PrimaryButton onClick={goThink}>听完了，开始思考</PrimaryButton>
                    </div>
                  )}
                </div>
              )}

              {/* ② 思考 */}
              {phase === 'think' && (
                <div className="mt-3 rounded-2xl bg-white/90 border px-3 py-3">
                  <p className="text-sm font-bold text-campus-ink">先带着支架想一想</p>
                  <p className="text-sm text-campus-ink/75 mt-2 whitespace-pre-wrap leading-relaxed">{thinkScaffold(selected)}</p>
                  <textarea
                    value={thinkAnswer}
                    onChange={(e) => setThinkAnswer(e.target.value)}
                    className="mt-3 w-full rounded-xl border px-3 py-2 text-sm min-h-[88px]"
                    placeholder="写下你的想法…"
                    disabled={busy}
                  />
                  <PrimaryButton className="mt-3" disabled={busy || !thinkAnswer.trim()} onClick={submitThink}>
                    提交想法
                  </PrimaryButton>
                </div>
              )}

              {/* ③ 为什么 */}
              {phase === 'why' && (
                <div className="mt-3 rounded-2xl bg-white/90 border px-3 py-3">
                  <p className="text-sm font-bold text-campus-ink">你为什么会这样想？材料里哪一点让你这么觉得？</p>
                  <p className="text-xs text-campus-ink/55 mt-1">你刚才说：{thinkAnswer}</p>
                  <textarea
                    value={whyAnswer}
                    onChange={(e) => setWhyAnswer(e.target.value)}
                    className="mt-3 w-full rounded-xl border px-3 py-2 text-sm min-h-[88px]"
                    placeholder="说说理由，可以点出节选里的句子或人物…"
                    disabled={busy}
                  />
                  <PrimaryButton className="mt-3" disabled={busy || !whyAnswer.trim()} onClick={() => void submitWhy()}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : '提交理由，听老师分析'}
                  </PrimaryButton>
                </div>
              )}

              {/* ④ 答案 */}
              {phase === 'answer' && (
                <div className="mt-3 rounded-2xl bg-white/90 border px-3 py-3">
                  <div className="text-xs font-bold text-campus-mint mb-2">小阅老师的欣赏回答</div>
                  {busy && !answerText ? (
                    <div className="flex items-center gap-2 text-sm text-campus-ink/60">
                      <Loader2 className="w-4 h-4 animate-spin" /> 正在结合节选与你的想法准备回答…
                    </div>
                  ) : (
                    <SpeakableBlock text={answerText} kind="general" subject="chinese">
                      <MarkdownLite text={answerText} />
                    </SpeakableBlock>
                  )}
                </div>
              )}
            </Card>
          )}

          {selected && phase === 'answer' && (
            <Card>
              <div className="font-bold mb-2">继续问 {CLASSICS_GUIDE.name}</div>
              <p className="text-xs text-campus-ink/55 mb-3">可以针对节选里的人物、句子提问，老师会结合正文继续引导。</p>
              <div className="space-y-2 max-h-[36vh] overflow-y-auto mb-3">
                {chat.map((m, i) => (
                  <div
                    key={`${m.role}-${i}`}
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      m.role === 'user' ? 'bg-campus-mint/15 ml-6' : 'bg-white border mr-4'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <SpeakableBlock text={m.content} kind="general" subject="chinese">
                        <MarkdownLite text={m.content} />
                      </SpeakableBlock>
                    ) : (
                      m.content
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void askAgent();
                  }}
                  className="flex-1 rounded-xl border px-3 py-2 text-sm"
                  placeholder="针对这段节选提问…"
                  disabled={busy}
                />
                <PrimaryButton disabled={busy || !input.trim()} onClick={() => void askAgent()}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </PrimaryButton>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityExploreRoom({
  kind,
  onBack,
}: {
  kind: 'art' | 'music';
  onBack: () => void;
}) {
  const student = useSchoolStore((s) => s.student)!;
  const teacherTone = useSchoolStore((s) => s.parent?.teacherTone || 'balanced');
  const bumpInterest = useSchoolStore((s) => s.bumpInterest);

  const guide = kind === 'art' ? ART_GUIDE : MUSIC_GUIDE;
  const activities = kind === 'art' ? ART_ACTIVITIES : MUSIC_ACTIVITIES;
  const interestKey = kind === 'art' ? 'art' : 'music';
  const speakSubject = kind === 'art' ? 'art' : undefined;
  const materialKind = kind === 'art' ? 'painting' : 'music';

  const [selected, setSelected] = useState<ArtActivity | MusicActivity | null>(null);
  const [phase, setPhase] = useState<GuideThinkPhase | null>(null);
  const [thinkAnswer, setThinkAnswer] = useState('');
  const [whyAnswer, setWhyAnswer] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'play' | 'guide' | 'agent'>('play');

  const speakGuide = (text: string) => {
    void speakTeacherAloud(text, student.grade, speakSubject).catch((e) => {
      toast.error(e instanceof Error ? e.message : '朗读失败');
    });
  };

  const activityContext = (a: ArtActivity | MusicActivity) =>
    `【活动】${a.title}
【简介】${a.blurb}
【材料】
${a.material}
【思考支架】${a.thinkPrompt}
【小提示】${a.tip}`;

  const openActivity = (a: ArtActivity | MusicActivity) => {
    setSelected(a);
    setPhase('material');
    setThinkAnswer('');
    setWhyAnswer('');
    setAnswerText('');
    setChat([]);
    setInput('');
    setTab('guide');
    bumpInterest(interestKey, 1);
    speakGuide(`${a.title}。我们先看材料。\n\n${a.material}`);
  };

  const goThink = () => {
    if (!selected) return;
    setPhase('think');
    speakGuide(selected.thinkPrompt);
  };

  const submitThink = () => {
    const a = thinkAnswer.trim();
    if (!a) {
      toast.message('先写下你的一点想法再继续哦');
      return;
    }
    setPhase('why');
    speakGuide('你为什么会这样想？材料里哪一点让你这么觉得？');
  };

  const submitWhy = async () => {
    const reason = whyAnswer.trim();
    if (!reason || !selected || busy) return;
    setPhase('answer');
    setBusy(true);
    bumpInterest(interestKey, 1);
    try {
      const reply = await schoolChat({
        temperature: 0.7,
        max_tokens: 1800,
        system: withAgeBand(
          `你是「${guide.name}」，${guide.persona}
当前学段：${bandLabel(student.ageBand)}。
用短段落、生动例子；鼓励动手体验；不要布置沉重作业；不要批评孩子「不会」。
${guidedThinkPedagogy({ phase: 'answer', materialKind })}
请结合【材料】与学生的想法、理由给出清晰观点/分析；回扣材料；结尾可留一个小延伸。`,
          student.ageBand,
          teacherTone,
          { role: 'teacher', student },
        ),
        user: `${activityContext(selected)}

【学生的思考】${thinkAnswer}
【学生的理由】${reason}
请给出答案与分析。`,
      });
      setAnswerText(reply);
      setChat([
        { role: 'assistant', content: `（已看材料）${selected.title}` },
        { role: 'user', content: `我的想法：${thinkAnswer}` },
        { role: 'user', content: `为什么：${reason}` },
        { role: 'assistant', content: reply },
      ]);
      speakGuide(reply);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '老师暂时忙线');
      const fallback = `你已经认真看材料并说出了理由，很棒。再回头听一遍材料，抓住最打动你的那一点；想继续时再来找我。`;
      setAnswerText(fallback);
      speakGuide(fallback);
    } finally {
      setBusy(false);
    }
  };

  const askAgent = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput('');
    const nextHistory = [...chat, { role: 'user' as const, content: q }];
    setChat(nextHistory);
    setBusy(true);
    bumpInterest(interestKey, 1);
    try {
      const focus = selected
        ? `${activityContext(selected)}\n【当前阶段】${phase || '自由提问'}`
        : '孩子在浏览活动列表。若尚无材料，先给一段简短材料再引导思考。';
      const reply = await schoolChat({
        temperature: 0.75,
        max_tokens: 1600,
        system: withAgeBand(
          `你是「${guide.name}」，${guide.persona}
当前学段：${bandLabel(student.ageBand)}。
用短段落、生动例子；鼓励动手体验；不要布置沉重作业；不要批评孩子「不会」。
${guidedThinkPedagogy({ phase: phase || (selected ? 'answer' : null), materialKind })}`,
          student.ageBand,
          teacherTone,
          { role: 'teacher', student },
        ),
        history: nextHistory.slice(-10),
        user: `${focus}
【学生先前思考】${thinkAnswer || '（未记录）'}
【学生先前理由】${whyAnswer || '（未记录）'}
学生问题：${q}`,
      });
      setChat([...nextHistory, { role: 'assistant', content: reply }]);
      speakGuide(reply);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '老师暂时忙线');
    } finally {
      setBusy(false);
    }
  };

  const resetActivity = () => {
    setSelected(null);
    setPhase(null);
    setThinkAnswer('');
    setWhyAnswer('');
    setAnswerText('');
    setChat([]);
    setInput('');
  };

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex gap-3 items-start">
          <TalkingTeacherFace
            src={guide.avatar}
            emoji={guide.emoji}
            name={guide.name}
            size={88}
            onClick={() =>
              speakGuide(
                selected && phase === 'material'
                  ? selected.material
                  : selected && answerText
                    ? answerText
                    : selected
                      ? `${selected.title}。${selected.tip}`
                      : guide.greeting,
              )
            }
            title="点头像听老师讲解"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-lg">{guide.name}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-campus-mint/15 text-campus-mint">
                {kind === 'art' ? '可画画' : '可弹琴'} · 动手玩
              </span>
            </div>
            <p className="text-sm text-campus-ink/75 mt-1 leading-relaxed">{guide.greeting}</p>
            <ReadAloudControls className="mt-2" />
            <BackButton label="返回兴趣室列表" className="!py-1.5 !px-2.5 !text-xs mt-2" onClick={onBack} />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['play', kind === 'art' ? '🎨 画布' : '🎹 乐器'],
            ['guide', '小课堂'],
            ['agent', `问${guide.name}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold border transition ${
              tab === id
                ? 'bg-campus-mint text-white border-campus-mint'
                : 'bg-white border-campus-ink/10 hover:border-campus-mint/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'play' &&
        (kind === 'art' ? (
          <PaintCanvas onPaint={() => bumpInterest(interestKey, 1)} />
        ) : (
          <MusicPlayPad onPlay={() => bumpInterest(interestKey, 1)} />
        ))}

      {tab === 'guide' && (
        <>
          {selected && (
            <Card className="border-campus-mint/30 bg-campus-mint/5">
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold">
                  {selected.emoji} {selected.title}
                </div>
                <button type="button" className="text-[11px] font-bold text-campus-ink/45" onClick={resetActivity}>
                  收起
                </button>
              </div>

              <StepIndicator phase={phase} />

              {phase && (
                <div className="mt-3 rounded-2xl bg-white/90 border px-3 py-3">
                  <div className="text-xs font-bold text-campus-mint">① 材料</div>
                  <SpeakableBlock text={selected.material} kind="general" subject={speakSubject}>
                    <p className="text-sm mt-2 whitespace-pre-wrap leading-relaxed text-campus-ink/85">{selected.material}</p>
                  </SpeakableBlock>
                  {phase === 'material' && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <PrimaryButton onClick={() => speakGuide(selected.material)}>再听一遍材料</PrimaryButton>
                      <PrimaryButton onClick={goThink}>听完了，开始思考</PrimaryButton>
                    </div>
                  )}
                </div>
              )}

              {phase === 'think' && (
                <div className="mt-3 rounded-2xl bg-white/90 border px-3 py-3">
                  <p className="text-sm font-bold text-campus-ink">先带着支架想一想</p>
                  <p className="text-sm text-campus-ink/75 mt-2 whitespace-pre-wrap leading-relaxed">{selected.thinkPrompt}</p>
                  <textarea
                    value={thinkAnswer}
                    onChange={(e) => setThinkAnswer(e.target.value)}
                    className="mt-3 w-full rounded-xl border px-3 py-2 text-sm min-h-[88px]"
                    placeholder="写下你的想法…"
                    disabled={busy}
                  />
                  <PrimaryButton className="mt-3" disabled={busy || !thinkAnswer.trim()} onClick={submitThink}>
                    提交想法
                  </PrimaryButton>
                </div>
              )}

              {phase === 'why' && (
                <div className="mt-3 rounded-2xl bg-white/90 border px-3 py-3">
                  <p className="text-sm font-bold text-campus-ink">你为什么会这样想？材料里哪一点让你这么觉得？</p>
                  <p className="text-xs text-campus-ink/55 mt-1">你刚才说：{thinkAnswer}</p>
                  <textarea
                    value={whyAnswer}
                    onChange={(e) => setWhyAnswer(e.target.value)}
                    className="mt-3 w-full rounded-xl border px-3 py-2 text-sm min-h-[88px]"
                    placeholder="说说理由，可以点出材料里的细节…"
                    disabled={busy}
                  />
                  <PrimaryButton className="mt-3" disabled={busy || !whyAnswer.trim()} onClick={() => void submitWhy()}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : '提交理由，听老师分析'}
                  </PrimaryButton>
                </div>
              )}

              {phase === 'answer' && (
                <div className="mt-3 rounded-2xl bg-white/90 border px-3 py-3">
                  <div className="text-xs font-bold text-campus-mint mb-2">{guide.name}的分析</div>
                  {busy && !answerText ? (
                    <div className="flex items-center gap-2 text-sm text-campus-ink/60">
                      <Loader2 className="w-4 h-4 animate-spin" /> 正在结合材料与你的想法准备回答…
                    </div>
                  ) : (
                    <SpeakableBlock text={answerText} kind="general" subject={speakSubject}>
                      <MarkdownLite text={answerText} />
                    </SpeakableBlock>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <PrimaryButton onClick={() => setTab('play')}>
                      {kind === 'art' ? '回去画画' : '回去弹琴'}
                    </PrimaryButton>
                    <PrimaryButton onClick={() => setTab('agent')}>继续问{guide.name}</PrimaryButton>
                  </div>
                </div>
              )}
            </Card>
          )}

          <div className="grid sm:grid-cols-2 gap-2">
            {activities.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => openActivity(a)}
                className="text-left rounded-2xl border bg-white/95 px-3 py-3 hover:border-campus-mint hover:-translate-y-0.5 transition shadow-sm"
              >
                <div className="flex gap-2 items-start">
                  <span className="text-2xl shrink-0">{a.emoji}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm">{a.title}</div>
                    <p className="text-xs text-campus-ink/70 mt-1 line-clamp-2">{a.blurb}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'agent' && (
        <Card>
          <div className="font-bold mb-2">和 {guide.name} 对话</div>
          <p className="text-xs text-campus-ink/55 mb-3">
            {selected
              ? '可继续围绕刚才的材料提问；老师会按四步引导回答。'
              : kind === 'art'
                ? '先去「画布」动手画；也可以问：怎么配色？名画怎么看？'
                : '先去「乐器」动手弹；也可以问：什么是节拍？这首歌为什么好听？'}
          </p>
          {selected && <StepIndicator phase={phase} />}
          <div className="space-y-2 max-h-[42vh] overflow-y-auto mb-3 mt-2">
            {chat.length === 0 && (
              <div className="rounded-2xl bg-campus-cream/70 px-3 py-2 text-sm text-campus-ink/70">{guide.greeting}</div>
            )}
            {chat.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-campus-mint/15 ml-6' : 'bg-white border mr-4'
                }`}
              >
                {m.role === 'assistant' ? (
                  <SpeakableBlock text={m.content} kind="general" subject={speakSubject}>
                    <MarkdownLite text={m.content} />
                  </SpeakableBlock>
                ) : (
                  m.content
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void askAgent();
              }}
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
              placeholder={`问问${guide.name}…`}
              disabled={busy}
            />
            <PrimaryButton disabled={busy || !input.trim()} onClick={() => void askAgent()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </PrimaryButton>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function FunTowerPage() {
  const unlocked = useSchoolStore((s) => s.funUnlockedToday);
  const unlockFun = useSchoolStore((s) => s.unlockFun);
  const interests = useSchoolStore((s) => s.interests);
  const [room, setRoom] = useState<InterestRoom | null>(null);

  const visibleRooms = INTEREST_ROOMS.filter((r) => r.visible);

  const enterRoom = (r: InterestRoom) => {
    if (!r.enabled) {
      toast.message(`${r.name}：${r.closedHint || '未开放'}`);
      return;
    }
    setRoom(r);
  };

  return (
    <Shell title="娱乐与自我探索楼" sceneSrc={SCENES.fun}>
      {!unlocked && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm">
            今日娱乐时间尚未解锁。完成任一学科「今日任务」即可解锁；也可临时开启体验。
          </p>
          <PrimaryButton className="mt-2" onClick={() => unlockFun()}>
            临时开启体验
          </PrimaryButton>
        </Card>
      )}

      {room?.id === 'classics' ? (
        <ClassicsRoom onBack={() => setRoom(null)} />
      ) : room?.id === 'art' ? (
        <ActivityExploreRoom kind="art" onBack={() => setRoom(null)} />
      ) : room?.id === 'music' ? (
        <ActivityExploreRoom kind="music" onBack={() => setRoom(null)} />
      ) : room && !room.enabled ? (
        <Card>
          <div className="font-bold text-lg">
            {room.emoji} {room.name}
          </div>
          <p className="mt-3 text-sm text-campus-ink/70">
            <span className="font-bold text-amber-700">未开放</span>
            ——该区域暂时关闭，请先探索名著赏析、绘画楼或音乐楼。
          </p>
          <BackButton className="mt-4" label="返回兴趣室列表" onClick={() => setRoom(null)} />
        </Card>
      ) : (
        <>
          <Card className="mb-3">
            <div className="font-bold">兴趣探索</div>
            <p className="text-xs text-campus-ink/60 mt-1 leading-relaxed">
              绘画楼可涂鸦，音乐楼可弹琴敲鼓；名著赏析听故事。Scratch 建设中。
            </p>
          </Card>
          <div className={`grid md:grid-cols-2 gap-3 ${!unlocked ? 'opacity-60 pointer-events-none' : ''}`}>
            {visibleRooms.map((r) =>
              r.enabled ? (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => enterRoom(r)}
                  className="rounded-3xl bg-white/90 shadow-soft p-4 text-left border border-white hover:-translate-y-0.5 transition"
                >
                  <div className="text-4xl">{r.emoji}</div>
                  <div className="font-bold mt-2">{r.name}</div>
                  <div className="text-xs text-campus-ink/60">{r.blurb}</div>
                  <div className="text-xs mt-2 text-campus-mint">兴趣值 {interests?.[r.key] ?? 0}</div>
                </button>
              ) : (
                <RoomClosedCard key={r.id} room={r} />
              ),
            )}
          </div>
        </>
      )}
    </Shell>
  );
}
