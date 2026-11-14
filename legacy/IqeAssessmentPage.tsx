import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import bankJson from '@/data/ops/bank_iqe_v1.json';
import { scoreAssessment, type BankItem, type ScoreJson } from '@/lib/iqe-scoring';
import type { IqeResult } from '@/lib/types';
import { useSchoolStore } from '@/store/school';
import { Shell, PrimaryButton } from '@/components/ui';
import { SCENES } from '@/lib/scenes';
import { syncIqeToCloud } from '@/lib/account-db';
import { goCampus } from '@/lib/go-campus';
import { schoolChat } from '@/lib/llm';
import { speakInterviewerAloud, stopReadAloud } from '@/lib/read-aloud';
import { TalkingTeacherFace } from '@/components/TalkingTeacher';

type InterviewItem = BankItem & { aside?: string };

const bank = bankJson as InterviewItem[];

const HOST = {
  name: '阿初老师',
  avatar: '/characters/principal-agent.png',
  title: '入校面谈',
};

const WELCOME_LINE =
  '哎，你来啦。我是阿初，今天这一关归我。别紧张，我不考你什么，就是想跟你聊两句。';

const GATES = [
  {
    id: 'IE' as const,
    label: '第一关',
    subtitle: '先认识你',
    intro: '那咱们随便聊聊。你平时日子怎么过，跟人怎么打交道？想到哪说到哪就行。',
  },
  {
    id: 'IQ' as const,
    label: '第二关',
    subtitle: '再看看你顺手的本事',
    intro: '聊得挺好嘛。换几道——看看你脑子哪块转得快。凭第一反应就行，不用硬想。',
  },
  {
    id: 'TENDENCY' as const,
    label: '第三关',
    subtitle: '走走几个小情境',
    intro:
      '最后一关，都是些平常会碰上的小情境。你就照平时的样子选——我好奇的是你真实那一下。',
  },
];

/** 低分兜底：先接住人，不评答案；禁止免责/赌气/客服腔 */
const SOFT_ASIDE = ['嗯——你这么看啊。', '哦，原来是这样。', '好，我听见了。'];

const ACHU_SPEAK_SYSTEM = `你是「阿初老师」：三十出头、热情爱笑的女老师，孩子进门第一个接住他/她的人。正在做入校面谈。
孩子刚选完一个选项。你只输出一句 15～35 字的中文口头回应（一到两个短句）。

说话规范（必须遵守）：
1. 主动、热乎、开心而正常；像笑着说话，慢半拍。
2. 先接住人，再谈事。✓「嗯——你这么看啊。」「哦，原来是这样。」「你还想到这一层了。」✗「好的，已记录。」「下一题。」
3. 具体，不空夸。✗「哇你太厉害了！」「你真棒！」
4. 短句口语，可用一个语气词（哎/诶/嗯/哦/哈/呀/吧/呢），不要堆。
5. 禁止书面连接词（因此/从而/综上所述）、客服腔（已为您/请稍等/感谢配合）、说明书腔。
6. 三类话绝对不说：
   · 免责赌气：没有标准答案 / 你爱怎么着就怎么着 / 随便你 / 都行 / 答错也没关系 / 这不是考你
   · 阴阳怪气：这还用问 / 你确定 / 嗯…你开心就好 / 哦，是吗
   · 评判对错：答对了 / 不太对 / 再想想 / 这个思路有问题
7. 不评价对错、不给结论、不要 emoji、不要连环反问。`;

/** 反向维度：分越高反而越冲，不能套用「低分=安慰」 */
const NEGATIVE_DIMENSIONS = new Set(['AGGRESSION']);

const reactionCache = new Map<string, string>();

/**
 * 选项差异化的本地兜底。
 * 主路径走 schoolChat 按选项生成；失败/超时退回这里。
 */
function reactionFor(item: InterviewItem, score: number): string {
  const base = item.aside || '嗯——我听见了。';
  if (score > 0 || NEGATIVE_DIMENSIONS.has(item.dimension)) return base;
  const i = [...item.qid].reduce((a, c) => a + c.charCodeAt(0), 0) % SOFT_ASIDE.length;
  return SOFT_ASIDE[i]!;
}

function clipSpeak(text: string, max = 60): string {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max);
}

function dwellMs(text: string): number {
  const n = String(text || '').length;
  return Math.min(5000, Math.max(1200, n * 130 + 400));
}

async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((resolve) => {
        timer = window.setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer != null) window.clearTimeout(timer);
  }
}

async function generateOptionReaction(
  item: InterviewItem,
  option: { key: string; text: string; score: number },
): Promise<string> {
  const cacheKey = `${item.qid}::${option.key}`;
  const hit = reactionCache.get(cacheKey);
  if (hit) return hit;

  const fallback = reactionFor(item, option.score);
  try {
    const raw = await withTimeout(
      schoolChat({
        prefer: 'auto',
        temperature: 0.9,
        max_tokens: 80,
        system: ACHU_SPEAK_SYSTEM,
        user: `题干：${item.stem}
孩子选的：${option.text}
这题大致在看：${item.dimension}
请只回一句口头回应（先接住人）。`,
      }),
      2500,
      fallback,
    );
    const line = String(raw || '')
      .replace(/["“”']/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(/[\n]/)[0]
      ?.trim();
    const banned =
      /没有标准答案|随便你|都行|这不是考你|答错也没关系|你爱怎么着|已记录|下一题|太厉害了|你真棒|答对了|不太对|再想想|你开心就好|这还用问/;
    const ok = Boolean(line && line.length >= 8 && line.length <= 40 && !banned.test(line));
    const final = ok ? line! : fallback;
    reactionCache.set(cacheKey, final);
    return final;
  } catch (e) {
    console.warn('[iqe] reaction generate failed → aside fallback', e);
    reactionCache.set(cacheKey, fallback);
    return fallback;
  }
}

const PERSONALITY_TIPS: Record<string, [string, string, string]> = {
  'I-A': [
    '讲解时先留一点安静思考的空档',
    '提问后等几秒，再请你开口',
    '书面整理思路会比当众抢答更舒服',
  ],
  'I-B': [
    '新内容先给规则和范例再练习',
    '观察一会儿再邀请你参与',
    '说明「接下来会发生什么」会让你更踏实',
  ],
  'I-C': [
    '长任务拆成小段，中间留喘息',
    '热闹活动后安排安静收尾',
    '减少突然打断，帮你保住专注',
  ],
  'E-A': [
    '多用对话和结伴练习',
    '允许你把想法说给同伴听',
    '小组分享会比闷头读更有劲',
  ],
  'E-B': [
    '可以给你一点「小队长」的职责',
    '用目标带动，而不是硬压进度',
    '让你帮忙活跃气氛，学习也更投入',
  ],
  'E-C': [
    '鼓励你边说边理思路',
    '口头梳理后再落笔',
    '卡住时先聊一轮，往往就通了',
  ],
};

const IQ_LABELS: Record<string, string> = {
  LOGIC: '逻辑',
  LANG: '语言',
  SPACE: '空间',
  MUSIC: '音乐',
  KINESTHETIC: '动觉',
  INTERPERSONAL: '人际',
  INTRAPERSONAL: '内省',
  NATURAL: '自然',
};

function toIqeResult(score: ScoreJson): IqeResult {
  return {
    version: 'v1',
    completedAt: new Date().toISOString(),
    personality: score.personality,
    personalityScores: score.personalityScores,
    iq: score.iq,
    iqPercentile: score.iqPercentile,
    tendency: score.tendency,
  };
}

function buildNarrative(r: IqeResult): string[] {
  const tipHead: Record<string, string> = {
    'I-A': '你偏爱先把事情在心里过一遍，再慢慢交出来',
    'I-B': '你进新场面时喜欢先看清规矩和气氛',
    'I-C': '热闹之后，你需要一点安静把自己充好电',
    'E-A': '你很容易跟别人打开话匣子，点子也坐不住',
    'E-B': '人一多，你身上常带着一点带动感',
    'E-C': '你习惯边说边想，嘴常常在帮脑子干活',
  };
  const top = Object.entries(r.iq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => IQ_LABELS[k] || k);
  const soft = Object.entries(r.iq)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 1)
    .map(([k]) => IQ_LABELS[k] || k);
  return [
    tipHead[r.personality] || '你有自己一套跟世界相处的方式',
    top.length ? `眼下更顺手的，好像是${top.join('和')}这一块` : '你各方面都还在生长里',
    soft.length ? `至于${soft[0]}，我们不急，以后可以慢慢练` : '以后一起慢慢练就好',
    '今天这几关，只是让我更认识你一点',
    '接下来老师们会按你的节奏来带你',
  ];
}

function IqRadar({ iq }: { iq: IqeResult['iq'] }) {
  const keys = Object.keys(IQ_LABELS);
  const cx = 120;
  const cy = 120;
  const r = 88;
  const pts = keys.map((k, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / keys.length;
    const v = Math.max(0, Math.min(100, iq[k as keyof typeof iq] ?? 0)) / 100;
    return {
      x: cx + Math.cos(ang) * r * v,
      y: cy + Math.sin(ang) * r * v,
      lx: cx + Math.cos(ang) * (r + 18),
      ly: cy + Math.sin(ang) * (r + 18),
      label: IQ_LABELS[k],
    };
  });
  const poly = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const grid = [0.25, 0.5, 0.75, 1].map((t) =>
    keys
      .map((_, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / keys.length;
        return `${cx + Math.cos(ang) * r * t},${cy + Math.sin(ang) * r * t}`;
      })
      .join(' '),
  );

  return (
    <svg viewBox="0 0 240 240" className="mx-auto h-56 w-56">
      {grid.map((g) => (
        <polygon key={g} points={g} fill="none" stroke="rgba(15,23,42,0.12)" strokeWidth="1" />
      ))}
      {keys.map((_, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / keys.length;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(ang) * r}
            y2={cy + Math.sin(ang) * r}
            stroke="rgba(15,23,42,0.1)"
          />
        );
      })}
      <polygon points={poly} fill="rgba(16,185,129,0.28)" stroke="#10b981" strokeWidth="2" />
      {pts.map((p) => (
        <text
          key={p.label}
          x={p.lx}
          y={p.ly}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-campus-ink/70"
          style={{ fontSize: 10 }}
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

function HostBubble({
  children,
  line,
  onReplay,
}: {
  children: React.ReactNode;
  line?: string;
  onReplay?: () => void;
}) {
  return (
    <div className="flex gap-3 items-start">
      <TalkingTeacherFace
        src={HOST.avatar}
        emoji="👩‍🏫"
        name={HOST.name}
        size={52}
        onClick={onReplay}
        title={line ? `点头像：再听阿初说一遍` : HOST.name}
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-campus-mint">{HOST.name}</div>
        <div className="mt-1 rounded-2xl rounded-tl-md bg-white/95 border border-campus-ink/10 px-3 py-2.5 text-sm leading-relaxed text-campus-ink">
          {children}
        </div>
      </div>
    </div>
  );
}

type Phase = 'welcome' | 'gate-intro' | 'question' | 'aside' | 'result';

export default function IqeAssessmentPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromIntake = params.get('from') === 'intake';
  const setIqeResult = useSchoolStore((s) => s.setIqeResult);
  const existing = useSchoolStore((s) => s.iqeResult);
  const addPoints = useSchoolStore((s) => s.addPoints);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const answersRef = useRef<Record<string, number>>({});
  const finishingRef = useRef(false);
  const asideAdvanceRef = useRef(false);
  const [phase, setPhase] = useState<Phase>(() => (existing ? 'result' : 'welcome'));
  const [result, setResult] = useState<IqeResult | null>(existing);
  const [pendingAside, setPendingAside] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [gateStarted, setGateStarted] = useState<Record<string, boolean>>({});
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [picking, setPicking] = useState(false);
  const speakGen = useRef(0);

  const current = bank[idx];
  const gateIndex = current ? GATES.findIndex((g) => g.id === current.section) : 0;
  const gate = GATES[Math.max(0, gateIndex)] || GATES[0]!;
  const gateItems = useMemo(() => bank.filter((b) => b.section === gate.id), [gate.id]);

  async function finishAll(nextAnswers: Record<string, number>) {
    if (finishingRef.current) return;
    finishingRef.current = true;
    stopReadAloud();
    const scored = toIqeResult(scoreAssessment(bank, nextAnswers));
    console.log('[iqe] setIqeResult payload', scored);
    setIqeResult(scored);
    setResult(scored);
    addPoints(20);
    setPhase('result');
    const cloudErr = await syncIqeToCloud(scored);
    if (cloudErr) toast.message(`面谈已记下；云端：${cloudErr.message}`);
    else toast.success('面谈结束，档案已写入');
  }

  function goNextAfterAside() {
    if (asideAdvanceRef.current) return;
    asideAdvanceRef.current = true;
    const latest = answersRef.current;
    if (idx + 1 >= bank.length) {
      void finishAll(latest);
      return;
    }
    const nextIdx = idx + 1;
    const next = bank[nextIdx]!;
    const prevSection = bank[idx]?.section;
    stopReadAloud();
    setIdx(nextIdx);
    if (next.section !== prevSection && !gateStarted[next.section]) {
      setPhase('gate-intro');
    } else {
      setPhase('question');
    }
  }

  async function playHostLine(text: string) {
    const line = clipSpeak(text);
    if (!audioUnlocked || !line) return;
    const gen = ++speakGen.current;
    try {
      stopReadAloud();
      await speakInterviewerAloud(line);
    } catch (e) {
      // speakInterviewerAloud 已 toast；这里只保证不挡流程
      console.warn('[iqe] playHostLine failed', e);
    }
    if (gen !== speakGen.current) return;
  }

  // 开场白 / 题干：进入阶段时朗读
  useEffect(() => {
    if (phase === 'gate-intro') {
      void playHostLine(gate.intro);
    } else if (phase === 'question' && current) {
      void playHostLine(current.stem);
    }
    return () => {
      /* 切阶段时由下一跳或 cleanup 停读 */
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, gate.id, current?.qid]);

  // 回应：等朗读结束 + 按字数停留，再跳下一题
  useEffect(() => {
    if (phase !== 'aside' || !pendingAside) return;
    asideAdvanceRef.current = false;
    let cancelled = false;
    const wait = dwellMs(pendingAside);

    (async () => {
      const speakP = audioUnlocked
        ? playHostLine(pendingAside).catch(() => undefined)
        : Promise.resolve();
      const delayP = new Promise<void>((r) => {
        window.setTimeout(r, wait);
      });
      await Promise.all([speakP, delayP]);
      if (!cancelled) goNextAfterAside();
    })();

    return () => {
      cancelled = true;
      stopReadAloud();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pendingAside, idx]);

  useEffect(() => () => stopReadAloud(), []);

  function resetInterview() {
    stopReadAloud();
    finishingRef.current = false;
    answersRef.current = {};
    setIdx(0);
    setAnswers({});
    setResult(null);
    setPendingAside('');
    setShowDetails(false);
    setGateStarted({});
    setAudioUnlocked(false);
    setPicking(false);
    setPhase('welcome');
  }

  async function pick(option: { key: string; text: string; score: number }) {
    if (!current || phase !== 'question' || picking) return;
    setPicking(true);
    stopReadAloud();
    const nextAnswers = { ...answersRef.current, [current.qid]: option.score };
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    try {
      const line = await generateOptionReaction(current, option);
      setPendingAside(line);
      setPhase('aside');
    } catch {
      setPendingAside(reactionFor(current, option.score));
      setPhase('aside');
    } finally {
      setPicking(false);
    }
  }

  async function beginInterview() {
    if (picking) return;
    setPicking(true);
    setAudioUnlocked(true);
    try {
      // 用户手势解锁后先念开场白，再进第一关（不传 voice_id，走 Edge）
      stopReadAloud();
      await speakInterviewerAloud(clipSpeak(WELCOME_LINE));
    } catch (e) {
      console.warn('[iqe] welcome speak failed', e);
    } finally {
      setPicking(false);
      setPhase('gate-intro');
    }
  }

  function startGate() {
    stopReadAloud();
    setGateStarted((s) => ({ ...s, [gate.id]: true }));
    setPhase('question');
  }

  const narrative = useMemo(() => (result ? buildNarrative(result) : []), [result]);
  const tips = result ? PERSONALITY_TIPS[result.personality] || PERSONALITY_TIPS['I-A'] : null;

  return (
    <Shell title={HOST.title} sceneSrc={SCENES.campus}>
      <div className="mx-auto max-w-lg space-y-4">
        {phase !== 'result' && phase !== 'welcome' && (
          <div className="rounded-2xl border border-campus-ink/10 bg-white/90 px-3 py-2.5">
            <div className="text-sm font-bold text-campus-ink/80">
              {gate.label}
              <span className="font-normal text-campus-ink/50"> · {gate.subtitle}</span>
            </div>
          </div>
        )}

        {phase === 'welcome' && (
          <div className="space-y-4">
            <HostBubble line={WELCOME_LINE}>
              <p>{WELCOME_LINE}</p>
            </HostBubble>
            <PrimaryButton className="w-full" disabled={picking} onClick={() => void beginInterview()}>
              {picking ? '阿初在说…' : '开始面谈'}
            </PrimaryButton>
            <p className="text-[11px] text-center text-campus-ink/40">点一下开始，阿初就会跟你说话</p>
          </div>
        )}

        {phase === 'gate-intro' && (
          <div className="space-y-4">
            <HostBubble line={gate.intro} onReplay={() => void playHostLine(gate.intro)}>
              <p>{gate.intro}</p>
            </HostBubble>
            <PrimaryButton className="w-full" onClick={startGate}>
              好，继续
            </PrimaryButton>
          </div>
        )}

        {phase === 'question' && current && (
          <div className="space-y-4">
            <HostBubble line={current.stem} onReplay={() => void playHostLine(current.stem)}>
              <p className="text-base leading-relaxed">{current.stem}</p>
            </HostBubble>
            <div className="space-y-2">
              {current.options.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  disabled={picking}
                  onClick={() => void pick(o)}
                  className="block w-full rounded-xl border border-campus-ink/10 bg-white px-4 py-3 text-left text-sm leading-relaxed hover:border-campus-mint disabled:opacity-60"
                >
                  {o.text}
                </button>
              ))}
            </div>
            {picking && (
              <p className="text-[11px] text-center text-campus-ink/40">阿初在听…</p>
            )}
          </div>
        )}

        {phase === 'aside' && (
          <div className="space-y-4">
            <HostBubble line={pendingAside} onReplay={() => void playHostLine(pendingAside)}>
              <p>{pendingAside}</p>
            </HostBubble>
            <PrimaryButton
              className="w-full"
              onClick={() => {
                stopReadAloud();
                goNextAfterAside();
              }}
            >
              继续
            </PrimaryButton>
          </div>
        )}

        {phase === 'result' && result && (
          <div className="space-y-4">
            <HostBubble>
              <div className="space-y-2">
                {narrative.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </HostBubble>

            <div className="rounded-2xl border border-campus-ink/10 bg-white/95 p-4">
              <div className="text-sm font-bold text-campus-ink">你顺手的几样本事</div>
              <p className="mt-1 text-xs text-campus-ink/55">图越大的方向，眼下越顺手</p>
              <IqRadar iq={result.iq} />
            </div>

            <div className="rounded-2xl border border-campus-ink/10 bg-white/95 p-4 space-y-2">
              <div className="text-sm font-bold">接下来这么带你</div>
              <ul className="list-disc pl-5 text-sm text-campus-ink/80 space-y-1">
                {tips?.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              className="text-xs text-campus-ink/50 underline"
              onClick={() => setShowDetails((v) => !v)}
            >
              {showDetails ? '收起详细数据' : '查看详细数据'}
            </button>
            {showDetails && (
              <pre className="overflow-auto rounded-xl bg-campus-ink/5 p-3 text-[11px] text-campus-ink/70">
                {JSON.stringify(
                  {
                    personality: result.personality,
                    personalityScores: result.personalityScores,
                    iq: result.iq,
                    iqPercentile: result.iqPercentile,
                    tendency: result.tendency,
                  },
                  null,
                  2,
                )}
              </pre>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <PrimaryButton
                onClick={() => {
                  if (fromIntake) goCampus(navigate, { requireIntakeDone: true });
                  else navigate('/principal');
                }}
              >
                {fromIntake ? '去校园' : '回校长室'}
              </PrimaryButton>
              <button
                type="button"
                className="rounded-2xl border border-campus-ink/15 px-4 py-2 text-sm"
                onClick={resetInterview}
              >
                再聊一次
              </button>
              <Link to="/parent" className="rounded-2xl px-4 py-2 text-sm text-campus-mint underline">
                家长中心
              </Link>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
