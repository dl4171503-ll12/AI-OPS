import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  DEFAULT_INSTRUMENT,
  FAMILY_META,
  JAPAN_INSTRUMENTS_BLOCKED_NOTE,
  defaultScaleForInstrument,
  getInstrument,
  instrumentsByFamily,
  type InstrumentFamily,
  type InstrumentId,
} from '@/lib/instrument-catalog';
import {
  CULTURE_META,
  applyWuyinChromaticTables,
  getScaleDef,
  scaleButtonLabel,
  scalesForCulture,
  wuyinBlackKeyLabels,
  wuyinKeyLabels,
  wuyinTonicMidi,
  type CultureId,
  type ScaleId,
} from '@/lib/music-scales';
import {
  DEFAULT_PITCH,
  TWINKLE,
  WUYIN_DEMO_DUR_SCALE,
  WUYIN_NOTE_GAP_SEC,
  bindAudioUnlockOnce,
  ensureAudioReady,
  formatPitchLabel,
  getAudioContext,
  playNote,
  playSong,
  type PitchAdjust,
} from '@/lib/music-synth';
import { researchScaleAudioDual } from '@/lib/scale-audio-research';
import {
  getAuditedAudios,
  playAuditedScaleAudio,
  stopScaleAudioPlayback,
  type AuditedScaleAudio,
} from '@/lib/scale-audio-library';
import {
  buildChromaticFromWuyinCents,
  formatWuyinCentsLine,
  getWuyinTuning,
  resetWuyinTuning,
  snapMidiToWuyinZheng,
  type WuyinTuningState,
} from '@/lib/wuyin-tuning';

const WHITE_KEYS = [
  { midi: 60, label: 'Do', pinyin: '' },
  { midi: 62, label: 'Re', pinyin: '' },
  { midi: 64, label: 'Mi', pinyin: '' },
  { midi: 65, label: 'Fa', pinyin: '' },
  { midi: 67, label: 'Sol', pinyin: '' },
  { midi: 69, label: 'La', pinyin: '' },
  { midi: 71, label: 'Si', pinyin: '' },
  { midi: 72, label: 'Do↑', pinyin: '' },
] as const;

const BLACK_KEYS = [
  { midi: 61, leftPct: 9.5 },
  { midi: 63, leftPct: 22 },
  { midi: 66, leftPct: 47 },
  { midi: 68, leftPct: 59.5 },
  { midi: 70, leftPct: 72 },
] as const;

const FAMILIES = (Object.keys(FAMILY_META) as InstrumentFamily[]).sort(
  (a, b) => FAMILY_META[a].order - FAMILY_META[b].order,
);

const CULTURE_ORDER = (Object.keys(CULTURE_META) as CultureId[]).sort(
  (a, b) => CULTURE_META[a].order - CULTURE_META[b].order,
);

type Props = {
  onPlay?: () => void;
  className?: string;
};

export function MusicPlayPad({ onPlay, className = '' }: Props) {
  const [family, setFamily] = useState<InstrumentFamily>('keyboard');
  const [instrument, setInstrument] = useState<InstrumentId>(DEFAULT_INSTRUMENT);
  const [scale, setScale] = useState<ScaleId>(defaultScaleForInstrument(DEFAULT_INSTRUMENT));
  const [pitch, setPitch] = useState<PitchAdjust>(DEFAULT_PITCH);
  const [activeMidi, setActiveMidi] = useState<number | null>(null);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [cyclePlaying, setCyclePlaying] = useState(false);
  const [researching, setResearching] = useState(false);
  const [tuningInfo, setTuningInfo] = useState<WuyinTuningState>(() => getWuyinTuning());
  const [auditedAudios, setAuditedAudiosState] = useState<AuditedScaleAudio[]>(() =>
    getAuditedAudios(defaultScaleForInstrument(DEFAULT_INSTRUMENT)),
  );
  const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null);
  const cancelRef = useRef({ cancelled: false });
  const pitchRef = useRef(pitch);
  const scaleRef = useRef(scale);
  pitchRef.current = pitch;
  scaleRef.current = scale;

  const familyList = useMemo(() => instrumentsByFamily(family), [family]);
  const current = getInstrument(instrument);
  const isCnInstrument = current.culture === 'cn';
  const cultureScales = scalesForCulture(current.culture);
  const isCnWuyin = ['gong', 'shang', 'jue', 'zhi', 'yu'].includes(scale);
  const whiteKeys = useMemo(() => {
    if (!isCnWuyin) return WHITE_KEYS.map((k) => ({ midi: k.midi, han: k.label, pinyin: '', kind: 'zheng' as const }));
    return wuyinKeyLabels(scale, pitch).map((k) => ({
      midi: k.midi,
      han: k.han,
      pinyin: k.pinyin,
      kind: k.kind,
    }));
  }, [isCnWuyin, scale, pitch]);

  const cnBlackKeys = useMemo(() => {
    if (!isCnWuyin) return [];
    return wuyinBlackKeyLabels(scale, pitch);
  }, [isCnWuyin, scale, pitch]);

  const byCulture = useMemo(() => {
    const map = new Map<CultureId, typeof familyList>();
    for (const c of CULTURE_ORDER) map.set(c, []);
    for (const inst of familyList) {
      map.get(inst.culture)?.push(inst);
    }
    return CULTURE_ORDER.map((c) => ({ culture: c, items: map.get(c) || [] })).filter(
      (g) => g.items.length > 0,
    );
  }, [familyList]);

  useEffect(() => {
    bindAudioUnlockOnce();
    void ensureAudioReady();
    return () => {
      cancelRef.current.cancelled = true;
      stopScaleAudioPlayback();
    };
  }, []);

  useEffect(() => {
    setAuditedAudiosState(getAuditedAudios(scale));
    stopScaleAudioPlayback();
    setAudioPlayingId(null);
  }, [scale]);

  useEffect(() => {
    const list = instrumentsByFamily(family);
    if (!list.some((i) => i.id === instrument) && list[0]) {
      const next = list[0];
      setInstrument(next.id);
      setScale(defaultScaleForInstrument(next.id));
    }
  }, [family, instrument]);

  const bump = () => onPlay?.();

  const hitKey = (midi: number) => {
    void ensureAudioReady().then(() => {
      playNote(midi, instrument, pitchRef.current, scaleRef.current);
    });
    setActiveMidi(midi);
    bump();
    const holdMs = isCnWuyin ? 520 : 160;
    window.setTimeout(() => setActiveMidi((m) => (m === midi ? null : m)), holdMs);
  };

  const pickInstrument = (id: InstrumentId) => {
    void ensureAudioReady();
    getAudioContext();
    setInstrument(id);
    const nextScale = defaultScaleForInstrument(id);
    setScale(nextScale);
    const previewMidi = ['gong', 'shang', 'jue', 'zhi', 'yu'].includes(nextScale)
      ? wuyinTonicMidi(nextScale)
      : 60;
    playNote(previewMidi, id, pitchRef.current, nextScale);
    bump();
  };

  const pickScale = (id: ScaleId) => {
    void ensureAudioReady();
    getAudioContext();
    setScale(id);
    const previewMidi = ['gong', 'shang', 'jue', 'zhi', 'yu'].includes(id)
      ? wuyinTonicMidi(id)
      : 60;
    playNote(previewMidi, instrument, pitchRef.current, id);
    bump();
  };

  const runDemo = async () => {
    if (demoPlaying || cyclePlaying) {
      cancelRef.current.cancelled = true;
      setDemoPlaying(false);
      setCyclePlaying(false);
      return;
    }
    cancelRef.current = { cancelled: false };
    setDemoPlaying(true);
    bump();
    const transpose =
      ['gong', 'shang', 'jue', 'zhi', 'yu'].includes(scale) ? wuyinTonicMidi(scale) - 60 : 0;
    const notes = TWINKLE.map((n) => {
      const raw = n.midi + transpose;
      // 示范曲只走五声主音阶，不踩清角/变宫黑键
      const midi = ['gong', 'shang', 'jue', 'zhi', 'yu'].includes(scale)
        ? snapMidiToWuyinZheng(raw)
        : raw;
      const dur =
        ['gong', 'shang', 'jue', 'zhi', 'yu'].includes(scale)
          ? n.dur * WUYIN_DEMO_DUR_SCALE
          : n.dur;
      return { ...n, midi, dur };
    });
    await playSong(
      notes,
      instrument,
      (midi) => {
        setActiveMidi(midi);
        window.setTimeout(() => setActiveMidi((m) => (m === midi ? null : m)), 280);
      },
      cancelRef.current,
      pitchRef.current,
      scaleRef.current,
    );
    setDemoPlaying(false);
    setActiveMidi(null);
  };

  /** 完整播放当前调式升序循环 */
  const runModeCycle = async () => {
    if (demoPlaying || cyclePlaying) {
      cancelRef.current.cancelled = true;
      setDemoPlaying(false);
      setCyclePlaying(false);
      return;
    }
    cancelRef.current = { cancelled: false };
    setCyclePlaying(true);
    bump();
    if (isCnWuyin) {
      const keys = wuyinKeyLabels(scale, pitchRef.current);
      // 主音阶：五声 + 收尾高八度主音，上行再下行（不含黑键偏音）
      const sequence = [...keys, ...[...keys].reverse().slice(1)];
      const gapMs = Math.round(WUYIN_NOTE_GAP_SEC * 1000);
      for (const k of sequence) {
        if (cancelRef.current.cancelled) break;
        setActiveMidi(k.midi);
        playNote(k.midi, instrument, pitchRef.current, scaleRef.current);
        await new Promise((r) => setTimeout(r, gapMs));
      }
    } else {
      const midis = [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60];
      for (const m of midis) {
        if (cancelRef.current.cancelled) break;
        setActiveMidi(m);
        playNote(m, instrument, pitchRef.current, scaleRef.current);
        await new Promise((r) => setTimeout(r, 320));
      }
    }
    setCyclePlaying(false);
    setActiveMidi(null);
  };

  const runDualResearch = async () => {
    if (researching) return;
    setResearching(true);
    const def = getScaleDef(scale);
    toast.message(`DeepSeek 与 Kimi 正在同时检索「${def.name}」完整音频并双审纯净度…`);
    try {
      const result = await researchScaleAudioDual(scale);
      setAuditedAudiosState(result.audios);
      if (result.wuyinUpdated) setTuningInfo(getWuyinTuning());

      const playable = result.audios.find((a) => a.playable);
      if (playable) {
        toast.success(`已通过双审，开始播放：${playable.title}`);
        const ok = await playAuditedScaleAudio(playable);
        setAudioPlayingId(ok ? playable.id : null);
        if (!ok) {
          toast.message('直链播放失败，改播校内合成完整循环');
          await runModeCycle();
        }
      } else {
        if (result.rejectedHint) toast.message(result.rejectedHint);
        else toast.message('暂无内嵌可播直链，播放校内合成完整循环（保证无杂音无人声）');
        await runModeCycle();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '双模型检索失败');
    } finally {
      setResearching(false);
    }
  };

  const playAuditedItem = async (item: AuditedScaleAudio) => {
    if (audioPlayingId === item.id) {
      stopScaleAudioPlayback();
      setAudioPlayingId(null);
      return;
    }
    if (!item.playable) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
      toast.message('非直链：已外开；校内可点「完整循环」听纯净合成');
      return;
    }
    stopScaleAudioPlayback();
    const ok = await playAuditedScaleAudio(item);
    setAudioPlayingId(ok ? item.id : null);
    if (!ok) toast.error('该音频无法播放（可能已失效），已从试听中跳过');
  };

  const restoreSanfen = () => {
    const t = resetWuyinTuning();
    applyWuyinChromaticTables(buildChromaticFromWuyinCents(t.cents));
    setTuningInfo(t);
    toast.message('已恢复三分损益默认律');
  };

  return (
    <div
      className={`rounded-3xl border p-4 text-white shadow-soft relative overflow-hidden ${className} ${
        isCnInstrument
          ? 'border-[#c9a227]/55 bg-gradient-to-b from-[#4a0e12] via-[#6b151c] to-[#2a0a0c]'
          : 'border-campus-mint/25 bg-gradient-to-b from-[#1a2a3a] to-[#0f1a24]'
      }`}
    >
      {isCnInstrument && (
        <>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 12% 18%, #e8c547 0 2px, transparent 3px), radial-gradient(circle at 78% 30%, #e8c547 0 1.5px, transparent 3px), radial-gradient(circle at 40% 70%, #f3e5ab 0 2px, transparent 3px)',
              backgroundSize: '120px 90px',
            }}
          />
          <div className="pointer-events-none absolute -right-2 top-3 rotate-12 border-2 border-[#e8c547]/70 text-[#e8c547] rounded-full w-14 h-14 flex items-center justify-center text-[10px] font-black tracking-widest opacity-80">
            国乐
          </div>
        </>
      )}

      <div className="mb-3 relative">
        <div className="font-bold text-base">
          {isCnInstrument ? '🎼 国乐器台 · 钢琴式弹奏' : '🎹 乐器台 · 钢琴式弹奏'}
        </div>
        <p className={`text-[11px] mt-0.5 ${isCnInstrument ? 'text-[#f3e5ab]/75' : 'text-white/55'}`}>
          {isCnInstrument
            ? '朱砂鎏金 · 中方乐器 · 宫商角徵羽 · 双模型纯净音频'
            : '按类型 → 国家/文化区选乐器 · 双模型检索完整音频（须过纯净审核）'}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3 relative">
        {FAMILIES.map((f) => {
          const meta = FAMILY_META[f];
          const on = family === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFamily(f)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                on
                  ? isCnInstrument
                    ? 'bg-[#c23a2b] text-[#fff8e7] border border-[#e8c547]'
                    : 'bg-campus-mint text-white'
                  : isCnInstrument
                    ? 'bg-[#5c1015]/80 text-[#f3e5ab] border border-[#e8c547]/35 hover:bg-[#7a1a22]'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {meta.emoji} {meta.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5 mb-3 max-h-[28vh] overflow-y-auto pr-1 relative">
        {byCulture.map(({ culture, items }) => (
          <InstrumentGroup
            key={culture}
            title={`${CULTURE_META[culture].label}`}
            hint={CULTURE_META[culture].blurb}
            items={items}
            activeId={instrument}
            onPick={pickInstrument}
            chineseStyle={culture === 'cn'}
          />
        ))}
      </div>

      {current.culture === 'vietnam' && (
        <p className="text-[10px] text-amber-200/80 mb-2 leading-relaxed">{JAPAN_INSTRUMENTS_BLOCKED_NOTE}</p>
      )}

      <div
        className={`rounded-2xl px-3 py-2 mb-3 flex flex-wrap items-center gap-2 relative ${
          isCnInstrument
            ? 'bg-[#3d0c10]/80 border border-[#e8c547]/40'
            : 'bg-white/8 border border-white/10'
        }`}
      >
        <span className="text-sm font-bold">
          {isCnInstrument ? '🏯 ' : ''}
          当前：{current.name}
        </span>
        <span className={`text-[11px] ${isCnInstrument ? 'text-[#f3e5ab]/70' : 'text-white/50'}`}>
          {current.blurb}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${
            isCnInstrument
              ? 'bg-[#e8c547]/20 text-[#e8c547] border border-[#e8c547]/40'
              : 'bg-campus-mint/25 text-campus-mint'
          }`}
        >
          {FAMILY_META[current.family].label} · {CULTURE_META[current.culture].label}
        </span>
      </div>

      {/* 调式 */}
      <div className="rounded-2xl bg-black/25 border border-white/10 px-3 py-3 mb-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-white/90">🎼 调式（随国家优先）</div>
          <span className="text-[11px] text-campus-mint font-bold">{getScaleDef(scale).name}</span>
        </div>
        <p className="text-[10px] text-white/45">{getScaleDef(scale).blurb}</p>
        <div className="flex flex-wrap gap-1.5">
          {cultureScales.map((id) => {
            const def = getScaleDef(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => pickScale(id)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                  scale === id ? 'bg-campus-mint text-white' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {scaleButtonLabel(def, pitch)}
              </button>
            );
          })}
        </div>
        {isCnWuyin && (
          <p className="text-[10px] text-white/40">
            主音阶六白键：宫商角徵羽 + 高八度主音收尾。清角、变宫是黑键偏音（小调装饰），不进主循环。
          </p>
        )}
        <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 space-y-1.5 mt-1">
          <div className="text-[10px] font-bold text-amber-100/90">
            完整示范音频 · DeepSeek + Kimi 双审
          </div>
          <p className="text-[10px] text-white/45 leading-relaxed">
            须同时满足：无人声、无杂音、音调清晰。不通过则不播放外链，改用校内纯净合成循环。
          </p>
          {isCnWuyin && (
            <div className="text-[10px] text-white/55 leading-relaxed">
              五声律：{tuningInfo.method} · {formatWuyinCentsLine(tuningInfo.cents)}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={researching}
              onClick={() => void runDualResearch()}
              className="rounded-full px-2.5 py-1 text-[10px] font-bold bg-campus-mint/90 text-white disabled:opacity-50"
            >
              {researching
                ? '双模型检索审核中…'
                : `检索并播放「${getScaleDef(scale).name}」完整音频`}
            </button>
            {isCnWuyin && (
              <button
                type="button"
                onClick={restoreSanfen}
                className="rounded-full px-2.5 py-1 text-[10px] font-bold bg-white/10 hover:bg-white/20"
              >
                恢复三分损益
              </button>
            )}
            {audioPlayingId && (
              <button
                type="button"
                onClick={() => {
                  stopScaleAudioPlayback();
                  setAudioPlayingId(null);
                }}
                className="rounded-full px-2.5 py-1 text-[10px] font-bold bg-white/10 hover:bg-white/20"
              >
                停止外链音频
              </button>
            )}
          </div>
          {auditedAudios.length > 0 && (
            <div className="pt-1 space-y-1">
              <div className="text-[10px] text-white/45">已通过审核：</div>
              {auditedAudios.slice(0, 5).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => void playAuditedItem(a)}
                  className={`block w-full text-left text-[10px] truncate rounded-lg px-2 py-1 border transition ${
                    audioPlayingId === a.id
                      ? 'border-campus-mint bg-campus-mint/20 text-white'
                      : 'border-white/10 text-campus-mint hover:bg-white/10'
                  }`}
                  title={a.auditNote}
                >
                  {a.playable ? '▶ ' : '↗ '}
                  [{a.engines.join('+')}] {a.title}
                  {!a.quality.noVocals || !a.quality.noNoise || !a.quality.clearPitch
                    ? ''
                    : ' · 纯净'}
                </button>
              ))}
            </div>
          )}
        </div>
        {scale === 'japan' && (
          <p className="text-[10px] text-amber-200/75">日本调仅供音程对比试听，不提供日本乐器学习。</p>
        )}
      </div>

      {/* 音调微调 */}
      <div className="rounded-2xl bg-black/25 border border-white/10 px-3 py-3 mb-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-white/90">🎚️ 音调微调</div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-campus-mint font-bold">{formatPitchLabel(pitch)}</span>
            <button
              type="button"
              onClick={() => setPitch(DEFAULT_PITCH)}
              className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-white/10 hover:bg-white/20"
            >
              恢复
            </button>
          </div>
        </div>
        <label className="block">
          <div className="flex justify-between text-[10px] text-white/50 mb-1">
            <span>半音</span>
            <span className="font-bold text-white/80">
              {pitch.semitones > 0 ? '+' : ''}
              {pitch.semitones}
            </span>
          </div>
          <input
            type="range"
            min={-12}
            max={12}
            step={1}
            value={pitch.semitones}
            onChange={(e) => setPitch((p) => ({ ...p, semitones: Number(e.target.value) }))}
            className="w-full accent-campus-mint"
          />
        </label>
        <label className="block">
          <div className="flex justify-between text-[10px] text-white/50 mb-1">
            <span>音分</span>
            <span className="font-bold text-white/80">
              {pitch.cents > 0 ? '+' : ''}
              {pitch.cents}
            </span>
          </div>
          <input
            type="range"
            min={-50}
            max={50}
            step={1}
            value={pitch.cents}
            onChange={(e) => setPitch((p) => ({ ...p, cents: Number(e.target.value) }))}
            className="w-full accent-campus-mint"
          />
        </label>
      </div>

      {/* 统一钢琴键 */}
      <div className="relative mx-auto max-w-lg select-none touch-manipulation">
        <div className="flex gap-0.5">
          {whiteKeys.map((k) => {
            const lit = activeMidi === k.midi;
            return (
              <button
                key={`${k.midi}-${k.han}-${k.pinyin}`}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  hitKey(k.midi);
                }}
                className={`relative flex-1 h-40 rounded-b-lg border transition ${
                  lit
                    ? isCnInstrument
                      ? 'bg-[#e8c547]/50 translate-y-0.5 border-[#c23a2b]/40'
                      : 'bg-campus-mint/45 translate-y-0.5 border-black/15'
                    : isCnInstrument
                      ? 'bg-[#fff8e7] hover:bg-[#fffdf5] border-[#c9a227]/35'
                      : 'bg-[#f8f6f1] hover:bg-white border-black/15'
                }`}
              >
                <span className="absolute bottom-2 left-0 right-0 text-center leading-tight px-0.5">
                  <span
                    className={`block text-[11px] font-bold ${
                      isCnInstrument ? 'text-[#8b1a1a]' : 'text-campus-ink/80'
                    }`}
                  >
                    {k.han}
                  </span>
                  {k.pinyin ? (
                    <span
                      className={`block text-[9px] font-semibold tracking-wide mt-0.5 ${
                        isCnInstrument ? 'text-[#a67c00]' : 'text-campus-mint/90'
                      }`}
                    >
                      {k.pinyin}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        {!isCnWuyin && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[58%]">
            {BLACK_KEYS.map((k) => {
              const lit = activeMidi === k.midi;
              return (
                <button
                  key={k.midi}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    hitKey(k.midi);
                  }}
                  className={`pointer-events-auto absolute w-[8.5%] h-full rounded-b-md border border-black/40 shadow-md transition ${
                    lit ? 'bg-campus-mint' : 'bg-[#1c1c1c] hover:bg-[#333]'
                  }`}
                  style={{ left: `${k.leftPct}%` }}
                  aria-label={`黑键 ${k.midi}`}
                />
              );
            })}
          </div>
        )}
        {isCnWuyin && cnBlackKeys.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[58%]">
            {cnBlackKeys.map((k) => {
              const lit = activeMidi === k.midi;
              return (
                <button
                  key={`pian-${k.midi}-${k.han}`}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    hitKey(k.midi);
                  }}
                  className={`pointer-events-auto absolute w-[8.5%] h-full rounded-b-md border shadow-md transition flex flex-col items-center justify-end pb-1.5 ${
                    lit
                      ? 'bg-[#e8c547] border-[#c23a2b]/50 text-[#4a0e12]'
                      : 'bg-[#2a1810] hover:bg-[#3d2418] border-[#e8c547]/35 text-[#f3e5ab]'
                  }`}
                  style={{ left: `${k.leftPct}%` }}
                  aria-label={`偏音黑键 ${k.han}`}
                  title={`${k.han}（偏音·小调）`}
                >
                  <span className="text-[8px] font-bold leading-none">{k.han}</span>
                  <span className="text-[6px] opacity-70 mt-0.5">偏音</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => void runModeCycle()}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
            isCnInstrument
              ? 'bg-[#e8c547] text-[#4a0e12] hover:bg-[#f0d478]'
              : 'bg-amber-500/90 text-white hover:bg-amber-400'
          }`}
        >
          {cyclePlaying ? '停止循环' : '▶ 完整播放当前调式循环'}
        </button>
        <button
          type="button"
          onClick={() => void runDemo()}
          className="rounded-full px-3 py-1.5 text-xs font-bold bg-white/15 hover:bg-white/25 transition"
        >
          {demoPlaying ? '停止示范曲' : '▶ 听《小星星》示范'}
        </button>
        <span className="text-[11px] text-white/45">
          外链须过无人声/无杂音/音调清晰双审；否则播校内纯净合成
        </span>
      </div>
    </div>
  );
}

function InstrumentGroup({
  title,
  hint,
  items,
  activeId,
  onPick,
  chineseStyle = false,
}: {
  title: string;
  hint: string;
  items: ReturnType<typeof instrumentsByFamily>;
  activeId: InstrumentId;
  onPick: (id: InstrumentId) => void;
  chineseStyle?: boolean;
}) {
  return (
    <div
      className={
        chineseStyle
          ? 'rounded-2xl border border-[#e8c547]/35 bg-gradient-to-r from-[#5c1015]/50 to-[#3d0c10]/30 px-2.5 py-2'
          : ''
      }
    >
      <div className="flex flex-wrap items-baseline gap-2 mb-1.5">
        <span
          className={`text-[10px] font-bold tracking-wide ${
            chineseStyle ? 'text-[#e8c547]' : 'text-white/55'
          }`}
        >
          {chineseStyle ? `☁ ${title}` : title}
        </span>
        <span className={`text-[9px] ${chineseStyle ? 'text-[#f3e5ab]/55' : 'text-white/35'}`}>
          {hint}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((inst) => {
          const on = activeId === inst.id;
          return (
            <button
              key={inst.id}
              type="button"
              title={inst.blurb}
              onClick={() => onPick(inst.id)}
              className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold border transition ${
                chineseStyle
                  ? on
                    ? 'bg-[#c23a2b] border-[#e8c547] text-[#fff8e7] shadow-[0_0_0_1px_rgba(232,197,71,0.35)]'
                    : 'bg-[#6b151c]/70 border-[#e8c547]/30 text-[#f3e5ab] hover:border-[#e8c547]/70 hover:bg-[#8a1f28]'
                  : on
                    ? 'bg-campus-mint border-campus-mint text-white'
                    : 'bg-white/8 border-white/10 text-white/85 hover:bg-white/15 hover:border-white/25'
              }`}
            >
              {chineseStyle ? `✦ ${inst.name}` : inst.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
