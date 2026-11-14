/**
 * 虚拟实验工作台：多种引擎（电学/光学/化学混合/显微/测量等）
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { LabExperiment } from '@/lib/science-labs';
import { BlankLabSandbox } from '@/components/BlankLabSandbox';

type Props = {
  experiment: LabExperiment;
  onComplete?: (expId: string, passed: boolean) => void;
  compact?: boolean;
};

export function ScienceLabWorkbench({ experiment, onComplete, compact }: Props) {
  const isSandbox = experiment.engine === 'sandbox';
  const [doneSteps, setDoneSteps] = useState<Record<string, boolean>>({});
  const [quizAns, setQuizAns] = useState('');
  const [quizOk, setQuizOk] = useState<boolean | null>(null);
  const [note, setNote] = useState('');
  const [placedCount, setPlacedCount] = useState(0);

  useEffect(() => {
    setDoneSteps({});
    setQuizAns('');
    setQuizOk(null);
    setNote('');
    setPlacedCount(0);
  }, [experiment.id]);

  const stepsDone = experiment.steps.every((s) => doneSteps[s.id]);
  const canFinish = isSandbox
    ? placedCount >= 1
    : stepsDone && (!experiment.quiz || quizOk === true);

  const toggleStep = (id: string) => setDoneSteps((p) => ({ ...p, [id]: !p[id] }));

  const submitQuiz = () => {
    if (!experiment.quiz) return;
    const ok = quizAns.trim() === experiment.quiz.a;
    setQuizOk(ok);
    if (ok) toast.success('观察题正确！');
    else toast.message(`再想想～参考方向：${experiment.quiz.a}`);
  };

  const finish = () => {
    if (!canFinish) {
      toast.message(
        isSandbox
          ? '先从左侧拿出至少一件器材探索一下吧'
          : '请先完成步骤' + (experiment.quiz ? '并通过观察题' : ''),
      );
      return;
    }
    onComplete?.(experiment.id, true);
    toast.success(isSandbox ? `探索打卡：${experiment.title}` : `完成实验：${experiment.title}`);
  };

  return (
    <div
      className={`rounded-2xl border ${
        isSandbox
          ? 'border-emerald-200/80 bg-gradient-to-b from-emerald-50/70 to-white'
          : 'border-violet-200/80 bg-gradient-to-b from-violet-50/80 to-white'
      } ${compact ? 'p-3' : 'p-4'} space-y-3`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-campus-ink text-base flex items-center gap-2">
            <span>{experiment.emoji}</span>
            {experiment.title}
          </h3>
          <p className="text-xs text-campus-ink/60 mt-0.5">
            {experiment.topic} · 目标：{experiment.goal}
          </p>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isSandbox ? 'bg-emerald-100 text-emerald-800' : 'bg-violet-100 text-violet-700'
          }`}
        >
          {engineLabel(experiment.engine)}
        </span>
      </div>

      {experiment.safety.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200/80 px-3 py-2 text-[11px] text-amber-900/90">
          <span className="font-bold">安全提示：</span>
          {experiment.safety.join('；')}
        </div>
      )}

      {!isSandbox && (
        <ol className="space-y-1.5">
          {experiment.steps.map((s, i) => (
            <li key={s.id}>
              <label className="flex gap-2 items-start cursor-pointer text-sm">
                <input
                  type="checkbox"
                  className="mt-1 accent-violet-600"
                  checked={!!doneSteps[s.id]}
                  onChange={() => toggleStep(s.id)}
                />
                <span>
                  <span className="font-semibold text-violet-700 mr-1">{i + 1}.</span>
                  {s.text}
                  {s.hint ? (
                    <span className="block text-[11px] text-campus-ink/45 mt-0.5">{s.hint}</span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ol>
      )}

      {isSandbox ? (
        <BlankLabSandbox onNote={setNote} onExploreChange={setPlacedCount} />
      ) : (
        <EnginePanel experiment={experiment} onNote={setNote} />
      )}

      {isSandbox && (
        <details className="text-xs text-campus-ink/55">
          <summary className="cursor-pointer font-bold text-emerald-800">探索小提示（可选）</summary>
          <ol className="mt-1.5 space-y-1 list-decimal list-inside">
            {experiment.steps.map((s) => (
              <li key={s.id}>{s.text}</li>
            ))}
          </ol>
        </details>
      )}

      {note && !isSandbox ? (
        <p className="text-xs text-violet-800/90 bg-violet-50 rounded-lg px-2.5 py-1.5">{note}</p>
      ) : null}

      <label className="block">
        <span className="text-[11px] font-bold text-campus-ink/50">实验记录</span>
        <textarea
          className="mt-1 w-full rounded-xl border border-campus-ink/10 px-3 py-2 text-sm min-h-[64px]"
          placeholder={
            isSandbox ? '今天自由探索发现了什么？写下来告诉阿科老师…' : '写下你看到的现象与结论…'
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {experiment.quiz && (
        <div className="rounded-xl border border-campus-ink/10 bg-white px-3 py-2 space-y-2">
          <div className="text-xs font-bold">观察题：{experiment.quiz.q}</div>
          {experiment.quiz.options ? (
            <div className="flex flex-wrap gap-1.5">
              {experiment.quiz.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setQuizAns(opt)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                    quizAns === opt
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white border-campus-ink/15 hover:border-violet-400'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input
              className="w-full rounded-lg border px-2 py-1.5 text-sm"
              value={quizAns}
              onChange={(e) => setQuizAns(e.target.value)}
              placeholder="你的答案"
            />
          )}
          <button
            type="button"
            onClick={submitQuiz}
            className="rounded-full px-3 py-1 text-[11px] font-bold bg-violet-100 text-violet-800 hover:bg-violet-200"
          >
            提交观察题
          </button>
          {quizOk === true && <span className="text-[11px] text-emerald-600 font-bold ml-2">✓ 正确</span>}
          {quizOk === false && <span className="text-[11px] text-rose-600 font-bold ml-2">再试试</span>}
        </div>
      )}

      <button
        type="button"
        onClick={finish}
        className={`w-full rounded-full py-2.5 text-sm font-bold text-white transition ${
          isSandbox ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-violet-600 hover:bg-violet-500'
        }`}
      >
        {isSandbox ? '结束本次自由探索' : '完成本次实验练习'}
      </button>
    </div>
  );
}

function engineLabel(engine: LabExperiment['engine']): string {
  const map: Record<LabExperiment['engine'], string> = {
    guided: '步骤探究',
    circuit: '电学台',
    optics: '光学台',
    chem_mix: '试剂台',
    microscope: '显微台',
    measure: '测量台',
    heat: '热学台',
    ecology: '生态台',
    sandbox: '空白实验室',
  };
  return map[engine];
}

function EnginePanel({
  experiment,
  onNote,
}: {
  experiment: LabExperiment;
  onNote: (s: string) => void;
}) {
  switch (experiment.engine) {
    case 'circuit':
      return <CircuitEngine mode={(experiment.params?.mode as string) || 'series'} onNote={onNote} />;
    case 'optics':
      return <OpticsEngine mode={(experiment.params?.mode as string) || 'reflect'} onNote={onNote} />;
    case 'chem_mix':
      return <ChemMixEngine params={experiment.params || {}} onNote={onNote} />;
    case 'microscope':
      return <MicroscopeEngine specimen={(experiment.params?.specimen as string) || 'onion'} onNote={onNote} />;
    case 'measure':
      return <MeasureEngine mode={(experiment.params?.mode as string) || 'spring'} params={experiment.params} onNote={onNote} />;
    case 'heat':
      return <HeatEngine onNote={onNote} />;
    case 'ecology':
      return <EcologyEngine mode={(experiment.params?.mode as string) || 'foodchain'} onNote={onNote} />;
    case 'sandbox':
      return <BlankLabSandbox onNote={onNote} />;
    default:
      return (
        <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
          按上方步骤操作，并在记录区写下现象（本实验为引导探究型）。
        </div>
      );
  }
}

function CircuitEngine({ mode, onNote }: { mode: string; onNote: (s: string) => void }) {
  const [hasBattery, setHasBattery] = useState(false);
  const [hasSwitch, setHasSwitch] = useState(false);
  const [hasBulb, setHasBulb] = useState(false);
  const [hasBulb2, setHasBulb2] = useState(false);
  const [closed, setClosed] = useState(false);
  const [wired, setWired] = useState(false);

  const lit =
    hasBattery && hasSwitch && hasBulb && wired && closed && (mode !== 'parallel' || hasBulb2);

  useEffect(() => {
    if (lit) onNote(mode === 'parallel' ? '并联通路：两灯均可亮（虚拟）。' : '串联通路：灯泡发光！');
    else if (wired && closed) onNote('电路未完整，灯泡不亮。检查电源/开关/灯泡是否都已接入。');
  }, [lit, wired, closed, mode, onNote]);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
      <div className="text-xs font-bold text-amber-900">电学工作台 · {mode === 'parallel' ? '并联' : '串联'}</div>
      <div className="flex flex-wrap gap-1.5">
        <Chip on={hasBattery} onClick={() => setHasBattery((v) => !v)} label="电源" />
        <Chip on={hasSwitch} onClick={() => setHasSwitch((v) => !v)} label="开关" />
        <Chip on={hasBulb} onClick={() => setHasBulb((v) => !v)} label="灯泡①" />
        {mode === 'parallel' && (
          <Chip on={hasBulb2} onClick={() => setHasBulb2((v) => !v)} label="灯泡②" />
        )}
        <Chip on={wired} onClick={() => setWired((v) => !v)} label="连接导线" />
        <Chip on={closed} onClick={() => setClosed((v) => !v)} label={closed ? '开关闭合' : '开关断开'} />
      </div>
      <div
        className={`h-24 rounded-xl flex items-center justify-center text-3xl transition ${
          lit ? 'bg-yellow-200 shadow-inner' : 'bg-slate-200'
        }`}
      >
        {lit ? '💡✨' : '💡'}
      </div>
    </div>
  );
}

function OpticsEngine({ mode, onNote }: { mode: string; onNote: (s: string) => void }) {
  const [angle, setAngle] = useState(35);
  const reflect = angle;
  const refractAngle = (() => {
    const x = Math.sin((angle * Math.PI) / 180) / 1.33;
    const clamped = Math.max(-1, Math.min(1, x));
    return Math.round(Math.asin(clamped) * (180 / Math.PI));
  })();
  const refract = refractAngle;

  useEffect(() => {
    if (mode === 'reflect') onNote(`入射角 ${angle}°，反射角 ${reflect}°（反射定律：两角相等）。`);
    else if (mode === 'refract') onNote(`空气→水：入射角 ${angle}°，折射角约 ${refract}°。`);
    else if (mode === 'shadow') onNote(`光源方位变化时，影子朝相反方向延伸；角度越大影子越长（示意）。`);
    else onNote(`物距调节中（示意）：注意实像/虚像变化趋势。`);
  }, [angle, mode, reflect, refract, onNote]);

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 space-y-2">
      <div className="text-xs font-bold text-sky-900">光学台</div>
      <label className="block text-[11px]">
        入射角 / 光源方位：{angle}°
        <input
          type="range"
          min={10}
          max={70}
          value={angle}
          onChange={(e) => setAngle(Number(e.target.value))}
          className="w-full accent-sky-600"
        />
      </label>
      <svg viewBox="0 0 200 100" className="w-full h-28 bg-white rounded-lg border border-sky-100">
        <line x1="100" y1="10" x2="100" y2="90" stroke="#94a3b8" strokeDasharray="4 3" />
        <line x1="20" y1="90" x2="180" y2="90" stroke="#64748b" strokeWidth="2" />
        <line
          x1="100"
          y1="90"
          x2={100 - 70 * Math.sin((angle * Math.PI) / 180)}
          y2={90 - 70 * Math.cos((angle * Math.PI) / 180)}
          stroke="#f59e0b"
          strokeWidth="2"
        />
        {mode === 'reflect' || mode === 'shadow' ? (
          <line
            x1="100"
            y1="90"
            x2={100 + 70 * Math.sin((reflect * Math.PI) / 180)}
            y2={90 - 70 * Math.cos((reflect * Math.PI) / 180)}
            stroke="#0ea5e9"
            strokeWidth="2"
          />
        ) : (
          <line
            x1="100"
            y1="90"
            x2={100 + 50 * Math.sin((refract * Math.PI) / 180)}
            y2={90 + 40 * Math.cos((refract * Math.PI) / 180)}
            stroke="#8b5cf6"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
}

function ChemMixEngine({
  params,
  onNote,
}: {
  params: Record<string, unknown>;
  onNote: (s: string) => void;
}) {
  const reagents = (params.reagents as Array<{ id: string; name: string; color: string }>) || [];
  const reactions = (params.reactions as Record<string, { color: string; note: string; gas: boolean }>) || {};
  const [picked, setPicked] = useState<string[]>([]);

  const key = useMemo(() => [...picked].sort().join('+'), [picked]);
  // 兼容未排序写法
  const result =
    reactions[key] ||
    reactions[picked.join('+')] ||
    Object.entries(reactions).find(([k]) => k.split('+').sort().join('+') === key)?.[1];

  useEffect(() => {
    if (result) onNote(result.note + (result.gas ? '（有气体产生）' : ''));
  }, [result, onNote]);

  const toggle = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-2">
      <div className="text-xs font-bold text-rose-900">试剂台 · 点选试剂组合</div>
      <div className="flex flex-wrap gap-1.5">
        {reagents.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => toggle(r.id)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold border ${
              picked.includes(r.id) ? 'ring-2 ring-rose-400' : ''
            }`}
            style={{ background: r.color }}
          >
            {r.name}
          </button>
        ))}
      </div>
      <div
        className="h-24 rounded-xl border flex items-center justify-center text-sm font-bold transition"
        style={{ background: result?.color || '#f8fafc' }}
      >
        {result ? (
          <span>
            {result.gas ? '💨 ' : ''}
            {result.note}
          </span>
        ) : (
          <span className="text-slate-400 text-xs">选择试剂观察现象</span>
        )}
      </div>
      <button type="button" className="text-[11px] text-rose-700 underline" onClick={() => setPicked([])}>
        清空烧杯
      </button>
    </div>
  );
}

function MicroscopeEngine({
  specimen,
  onNote,
}: {
  specimen: string;
  onNote: (s: string) => void;
}) {
  const [focus, setFocus] = useState(30);
  const [zoom, setZoom] = useState(1);
  const sharp = focus > 45 && focus < 70;

  useEffect(() => {
    onNote(
      sharp
        ? `成像清晰（${specimen === 'compare' ? '可对比动植物细胞' : '洋葱表皮细胞'}）。可辨细胞轮廓。`
        : '画面模糊，请调节准焦螺旋。',
    );
  }, [sharp, specimen, onNote]);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
      <div className="text-xs font-bold text-emerald-900">显微台</div>
      <div
        className="relative h-36 rounded-full mx-auto w-36 border-4 border-emerald-800 overflow-hidden bg-emerald-100"
        style={{ filter: sharp ? 'none' : `blur(${Math.abs(focus - 55) / 12}px)` }}
      >
        <div
          className="absolute inset-0 flex flex-wrap content-center justify-center gap-1 p-4"
          style={{ transform: `scale(${zoom})` }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="w-7 h-5 rounded-md border border-emerald-700/50 bg-emerald-200/80 relative"
            >
              <span className="absolute left-1 top-1 w-1.5 h-1.5 rounded-full bg-emerald-800/70" />
            </div>
          ))}
        </div>
      </div>
      <label className="block text-[11px]">
        准焦：{focus}
        <input type="range" min={0} max={100} value={focus} onChange={(e) => setFocus(Number(e.target.value))} className="w-full accent-emerald-600" />
      </label>
      <label className="block text-[11px]">
        放大：{zoom.toFixed(1)}×
        <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-emerald-600" />
      </label>
    </div>
  );
}

function MeasureEngine({
  mode,
  params,
  onNote,
}: {
  mode: string;
  params?: Record<string, unknown>;
  onNote: (s: string) => void;
}) {
  const [v, setV] = useState(mode === 'ohm' ? 6 : mode === 'lever' ? 40 : 2);
  const R = Number(params?.R || 10);
  const k = Number(params?.k || 50);

  const reading = useMemo(() => {
    if (mode === 'ohm') return { label: '电流', value: (v / R).toFixed(2), unit: 'A' };
    if (mode === 'spring') return { label: '伸长', value: ((v * 9.8) / k).toFixed(2), unit: 'm（示意）' };
    return { label: '力矩差', value: Math.abs(3 * 20 - 2 * v).toFixed(1), unit: '（趋近 0 更平衡）' };
  }, [mode, v, R, k]);

  useEffect(() => {
    onNote(`${reading.label} ≈ ${reading.value} ${reading.unit}`);
  }, [reading, onNote]);

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 space-y-2">
      <div className="text-xs font-bold text-indigo-900">测量台 · {mode}</div>
      <label className="block text-[11px]">
        调节：{v}
        <input
          type="range"
          min={mode === 'lever' ? 10 : 1}
          max={mode === 'lever' ? 80 : mode === 'ohm' ? 12 : 5}
          step={mode === 'ohm' ? 0.5 : 1}
          value={v}
          onChange={(e) => setV(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
      </label>
      <div className="text-center text-lg font-black text-indigo-800 tabular-nums">
        {reading.label} {reading.value}
        <span className="text-xs font-bold ml-1">{reading.unit}</span>
      </div>
    </div>
  );
}

function HeatEngine({ onNote }: { onNote: (s: string) => void }) {
  const [temp, setTemp] = useState(20);
  const height = 20 + (temp - 20) * 0.8;

  useEffect(() => {
    onNote(`温度 ${temp}℃，液柱高度示意 ${height.toFixed(0)}。升温液柱上升（热胀）。`);
  }, [temp, height, onNote]);

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 space-y-2">
      <div className="text-xs font-bold text-orange-900">热学台</div>
      <div className="flex items-end justify-center gap-4 h-32">
        <div className="w-8 h-28 rounded-full border-2 border-orange-300 bg-white relative overflow-hidden">
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-500 to-orange-300 transition-all"
            style={{ height: `${Math.min(100, height)}%` }}
          />
        </div>
        <div className="text-2xl">{temp >= 60 ? '🔥' : '🌡️'}</div>
      </div>
      <input type="range" min={20} max={90} value={temp} onChange={(e) => setTemp(Number(e.target.value))} className="w-full accent-orange-500" />
    </div>
  );
}

function EcologyEngine({ mode, onNote }: { mode: string; onNote: (s: string) => void }) {
  const [light, setLight] = useState(true);
  const [order, setOrder] = useState<string[]>([]);
  const cards = ['草', '兔', '狐'];

  useEffect(() => {
    if (mode === 'foodchain') {
      onNote(order.join(' → ') || '点击卡片排出食物链');
    } else if (mode === 'photo') {
      onNote(light ? '有光：叶片可检测到淀粉（虚拟阳性）' : '无光：淀粉检测偏弱（虚拟）');
    } else if (mode === 'respire') {
      onNote('萌发种子组氧气下降、二氧化碳上升（示意）。');
    } else {
      onNote(light ? '有光组幼苗更绿更高' : '遮光组幼苗发黄较弱');
    }
  }, [mode, light, order, onNote]);

  if (mode === 'foodchain') {
    return (
      <div className="rounded-xl border border-lime-200 bg-lime-50/50 p-3 space-y-2">
        <div className="text-xs font-bold text-lime-900">生态台 · 食物链</div>
        <div className="flex flex-wrap gap-1.5">
          {cards.map((c) => (
            <button
              key={c}
              type="button"
              disabled={order.includes(c)}
              onClick={() => setOrder((o) => [...o, c])}
              className="rounded-full px-3 py-1 text-xs font-bold bg-white border border-lime-300 disabled:opacity-40"
            >
              {c}
            </button>
          ))}
          <button type="button" className="text-[11px] underline" onClick={() => setOrder([])}>
            重置
          </button>
        </div>
        <div className="text-sm font-bold text-center py-2">{order.join(' → ') || '…'}</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-lime-200 bg-lime-50/50 p-3 space-y-2">
      <div className="text-xs font-bold text-lime-900">生态 / 生理台</div>
      <button
        type="button"
        onClick={() => setLight((v) => !v)}
        className={`rounded-full px-3 py-1.5 text-xs font-bold ${light ? 'bg-yellow-300' : 'bg-slate-300'}`}
      >
        {light ? '☀️ 有光' : '🌑 遮光'}
      </button>
      <div className="text-center text-4xl py-3">{light ? '🌱🌿' : '🥀'}</div>
    </div>
  );
}

function Chip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-bold border transition ${
        on ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-amber-200 text-amber-900'
      }`}
    >
      {label}
    </button>
  );
}
