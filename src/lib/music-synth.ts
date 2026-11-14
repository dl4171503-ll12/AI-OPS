/**
 * Web Audio 合成：多乐器音色 + 地域调式 + 音调调节（半音 / 音分）
 */
import type { InstrumentId } from './instrument-catalog';
import { scaledMidiToHz, type ScaleId } from './music-scales';

export type { InstrumentId };

let sharedCtx: AudioContext | null = null;
let unlockBound = false;

export function getAudioContext(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext();
  }
  return sharedCtx;
}

/** 确保音频上下文已运行（处理浏览器自动播放策略 / suspended） */
export async function ensureAudioReady(): Promise<AudioContext> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
  // 再失败时用静音 buffer 唤醒
  if (ctx.state === 'suspended') {
    try {
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
  return ctx;
}

/** 绑定一次全局手势解锁，避免偶发「点了没声」 */
export function bindAudioUnlockOnce() {
  if (unlockBound || typeof window === 'undefined') return;
  unlockBound = true;
  const unlock = () => {
    void ensureAudioReady();
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** 音调调节：半音偏移 + 音分微调（100 音分 = 1 半音） */
export type PitchAdjust = {
  /** -12 … +12 */
  semitones: number;
  /** -50 … +50 */
  cents: number;
};

export const DEFAULT_PITCH: PitchAdjust = { semitones: 0, cents: 0 };
export const DEFAULT_SCALE: ScaleId = 'kaiser';

export function adjustedHz(midi: number, pitch: PitchAdjust = DEFAULT_PITCH): number {
  const totalSemis = pitch.semitones + pitch.cents / 100;
  return midiToHz(midi + totalSemis);
}

export function formatPitchLabel(pitch: PitchAdjust): string {
  const s = pitch.semitones;
  const c = pitch.cents;
  if (s === 0 && c === 0) return '原高';
  const parts: string[] = [];
  if (s !== 0) parts.push(`${s > 0 ? '+' : ''}${s} 半音`);
  if (c !== 0) parts.push(`${c > 0 ? '+' : ''}${c} 音分`);
  return parts.join(' · ');
}

type PartialSpec = {
  type: OscillatorType;
  /** 相对基频倍率 */
  ratio: number;
  peak: number;
  detune?: number;
};

type VoiceProfile = {
  partials: PartialSpec[];
  attack: number;
  decay: number;
  duration: number;
  filterFreq?: number;
  filterQ?: number;
  filterType?: BiquadFilterType;
  /** 气息/噪声混合 0–1 */
  breath?: number;
  /** 打击感噪声短促 */
  strikeNoise?: number;
};

const VOICES: Partial<Record<InstrumentId, VoiceProfile>> = {
  // 弦 · 中
  erhu: {
    partials: [
      { type: 'sawtooth', ratio: 1, peak: 0.16 },
      { type: 'sine', ratio: 2, peak: 0.08 },
      { type: 'sine', ratio: 3, peak: 0.04 },
    ],
    attack: 0.04,
    decay: 0.7,
    duration: 0.95,
    filterFreq: 2200,
    filterQ: 0.8,
  },
  gaohu: {
    partials: [
      { type: 'sawtooth', ratio: 1, peak: 0.14 },
      { type: 'sine', ratio: 2.01, peak: 0.1 },
      { type: 'triangle', ratio: 3, peak: 0.05 },
    ],
    attack: 0.03,
    decay: 0.65,
    duration: 0.9,
    filterFreq: 3200,
  },
  banhu: {
    partials: [
      { type: 'square', ratio: 1, peak: 0.1 },
      { type: 'sawtooth', ratio: 1, peak: 0.08 },
      { type: 'sine', ratio: 2, peak: 0.06 },
    ],
    attack: 0.02,
    decay: 0.55,
    duration: 0.75,
    filterFreq: 2800,
  },
  guzheng: {
    partials: [
      { type: 'triangle', ratio: 1, peak: 0.22 },
      { type: 'sine', ratio: 2, peak: 0.1 },
      { type: 'sine', ratio: 3, peak: 0.04 },
      { type: 'sine', ratio: 5, peak: 0.02 },
    ],
    attack: 0.004,
    decay: 1.1,
    duration: 1.3,
    filterFreq: 4000,
  },
  pipa: {
    partials: [
      { type: 'triangle', ratio: 1, peak: 0.2 },
      { type: 'square', ratio: 1, peak: 0.04 },
      { type: 'sine', ratio: 2.5, peak: 0.06 },
    ],
    attack: 0.003,
    decay: 0.55,
    duration: 0.7,
    filterFreq: 3500,
  },
  yangqin: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.22 },
      { type: 'sine', ratio: 2.76, peak: 0.08 },
      { type: 'triangle', ratio: 4.1, peak: 0.04 },
    ],
    attack: 0.002,
    decay: 0.7,
    duration: 0.85,
    strikeNoise: 0.08,
  },
  guqin: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.2 },
      { type: 'sine', ratio: 2, peak: 0.06 },
      { type: 'sine', ratio: 3, peak: 0.03, detune: 6 },
    ],
    attack: 0.01,
    decay: 1.4,
    duration: 1.6,
    filterFreq: 1800,
  },
  // 弦 · 西
  violin: {
    partials: [
      { type: 'sawtooth', ratio: 1, peak: 0.14 },
      { type: 'sawtooth', ratio: 1, peak: 0.06, detune: 5 },
      { type: 'sine', ratio: 2, peak: 0.07 },
    ],
    attack: 0.05,
    decay: 0.75,
    duration: 1,
    filterFreq: 2500,
  },
  viola: {
    partials: [
      { type: 'sawtooth', ratio: 1, peak: 0.15 },
      { type: 'triangle', ratio: 1.5, peak: 0.06 },
      { type: 'sine', ratio: 2, peak: 0.05 },
    ],
    attack: 0.06,
    decay: 0.8,
    duration: 1.05,
    filterFreq: 1800,
  },
  cello: {
    partials: [
      { type: 'sawtooth', ratio: 1, peak: 0.16 },
      { type: 'sine', ratio: 0.5, peak: 0.05 },
      { type: 'sine', ratio: 2, peak: 0.06 },
    ],
    attack: 0.07,
    decay: 0.9,
    duration: 1.15,
    filterFreq: 1400,
  },
  double_bass: {
    partials: [
      { type: 'sawtooth', ratio: 1, peak: 0.18 },
      { type: 'sine', ratio: 0.5, peak: 0.08 },
      { type: 'triangle', ratio: 2, peak: 0.04 },
    ],
    attack: 0.08,
    decay: 1,
    duration: 1.25,
    filterFreq: 900,
  },
  harp: {
    partials: [
      { type: 'triangle', ratio: 1, peak: 0.2 },
      { type: 'sine', ratio: 2, peak: 0.08 },
      { type: 'sine', ratio: 4, peak: 0.03 },
    ],
    attack: 0.005,
    decay: 1.2,
    duration: 1.4,
  },
  guitar: {
    partials: [
      { type: 'triangle', ratio: 1, peak: 0.18 },
      { type: 'sawtooth', ratio: 1, peak: 0.05 },
      { type: 'sine', ratio: 2, peak: 0.07 },
      { type: 'sine', ratio: 3, peak: 0.03 },
    ],
    attack: 0.004,
    decay: 0.85,
    duration: 1,
    filterFreq: 3000,
  },
  // 管 · 中
  dizi: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.18 },
      { type: 'triangle', ratio: 2, peak: 0.07 },
      { type: 'sine', ratio: 3, peak: 0.03 },
    ],
    attack: 0.03,
    decay: 0.55,
    duration: 0.8,
    breath: 0.12,
    filterFreq: 4500,
  },
  xiao: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.2 },
      { type: 'sine', ratio: 2, peak: 0.04 },
    ],
    attack: 0.08,
    decay: 0.9,
    duration: 1.1,
    breath: 0.08,
    filterFreq: 2200,
  },
  suona: {
    partials: [
      { type: 'square', ratio: 1, peak: 0.12 },
      { type: 'sawtooth', ratio: 1, peak: 0.1 },
      { type: 'sine', ratio: 2, peak: 0.06 },
    ],
    attack: 0.02,
    decay: 0.5,
    duration: 0.7,
    filterFreq: 3800,
    breath: 0.06,
  },
  sheng: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.12 },
      { type: 'sine', ratio: 1.5, peak: 0.08 },
      { type: 'sine', ratio: 2, peak: 0.07 },
      { type: 'triangle', ratio: 3, peak: 0.04 },
    ],
    attack: 0.04,
    decay: 0.7,
    duration: 0.9,
    breath: 0.05,
  },
  hulusi: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.18 },
      { type: 'triangle', ratio: 2, peak: 0.05 },
      { type: 'sine', ratio: 1, peak: 0.04, detune: -8 },
    ],
    attack: 0.05,
    decay: 0.75,
    duration: 1,
    breath: 0.1,
    filterFreq: 2800,
  },
  // 管 · 西
  flute: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.2 },
      { type: 'sine', ratio: 2, peak: 0.05 },
      { type: 'triangle', ratio: 3, peak: 0.02 },
    ],
    attack: 0.04,
    decay: 0.6,
    duration: 0.85,
    breath: 0.1,
    filterFreq: 5000,
  },
  clarinet: {
    partials: [
      { type: 'square', ratio: 1, peak: 0.1 },
      { type: 'sine', ratio: 3, peak: 0.08 },
      { type: 'sine', ratio: 5, peak: 0.04 },
    ],
    attack: 0.04,
    decay: 0.65,
    duration: 0.9,
    filterFreq: 2400,
  },
  oboe: {
    partials: [
      { type: 'sawtooth', ratio: 1, peak: 0.1 },
      { type: 'square', ratio: 1, peak: 0.06 },
      { type: 'sine', ratio: 2, peak: 0.05 },
    ],
    attack: 0.05,
    decay: 0.6,
    duration: 0.85,
    filterFreq: 2600,
  },
  saxophone: {
    partials: [
      { type: 'sawtooth', ratio: 1, peak: 0.12 },
      { type: 'square', ratio: 1, peak: 0.05 },
      { type: 'sine', ratio: 2, peak: 0.06 },
      { type: 'sine', ratio: 3, peak: 0.03 },
    ],
    attack: 0.05,
    decay: 0.7,
    duration: 0.95,
    filterFreq: 2000,
    breath: 0.04,
  },
  trumpet: {
    partials: [
      { type: 'sawtooth', ratio: 1, peak: 0.12 },
      { type: 'square', ratio: 1, peak: 0.08 },
      { type: 'sine', ratio: 2, peak: 0.07 },
      { type: 'sine', ratio: 3, peak: 0.04 },
    ],
    attack: 0.025,
    decay: 0.55,
    duration: 0.75,
    filterFreq: 3200,
  },
  trombone: {
    partials: [
      { type: 'sawtooth', ratio: 1, peak: 0.14 },
      { type: 'sine', ratio: 0.5, peak: 0.05 },
      { type: 'triangle', ratio: 2, peak: 0.05 },
    ],
    attack: 0.04,
    decay: 0.7,
    duration: 0.95,
    filterFreq: 1600,
  },
  french_horn: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.16 },
      { type: 'triangle', ratio: 1, peak: 0.08 },
      { type: 'sine', ratio: 2, peak: 0.05 },
    ],
    attack: 0.06,
    decay: 0.75,
    duration: 1,
    filterFreq: 1800,
  },
  // 键盘
  accordion_cn: {
    partials: [
      { type: 'sawtooth', ratio: 1, peak: 0.1 },
      { type: 'sawtooth', ratio: 1, peak: 0.08, detune: 8 },
      { type: 'sine', ratio: 2, peak: 0.05 },
    ],
    attack: 0.03,
    decay: 0.65,
    duration: 0.9,
    filterFreq: 2200,
  },
  piano: {
    partials: [
      { type: 'triangle', ratio: 1, peak: 0.22 },
      { type: 'sine', ratio: 1, peak: 0.1, detune: 3 },
      { type: 'sine', ratio: 2, peak: 0.06 },
      { type: 'sine', ratio: 3, peak: 0.025 },
    ],
    attack: 0.008,
    decay: 0.7,
    duration: 0.9,
  },
  organ: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.12 },
      { type: 'sine', ratio: 2, peak: 0.1 },
      { type: 'sine', ratio: 3, peak: 0.07 },
      { type: 'sine', ratio: 4, peak: 0.05 },
      { type: 'sine', ratio: 6, peak: 0.03 },
    ],
    attack: 0.02,
    decay: 0.85,
    duration: 1.1,
  },
  accordion: {
    partials: [
      { type: 'sawtooth', ratio: 1, peak: 0.09 },
      { type: 'sawtooth', ratio: 1, peak: 0.07, detune: 12 },
      { type: 'triangle', ratio: 2, peak: 0.05 },
    ],
    attack: 0.03,
    decay: 0.6,
    duration: 0.85,
    filterFreq: 2400,
  },
  electric_piano: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.18 },
      { type: 'sine', ratio: 2.01, peak: 0.08 },
      { type: 'triangle', ratio: 4, peak: 0.04 },
    ],
    attack: 0.005,
    decay: 0.75,
    duration: 0.95,
  },
  // 打击 · 中
  bianzhong: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.2 },
      { type: 'sine', ratio: 2.4, peak: 0.1 },
      { type: 'sine', ratio: 3.1, peak: 0.05 },
      { type: 'triangle', ratio: 5.2, peak: 0.03 },
    ],
    attack: 0.002,
    decay: 1.5,
    duration: 1.7,
    strikeNoise: 0.1,
  },
  qing: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.22 },
      { type: 'sine', ratio: 3.2, peak: 0.08 },
    ],
    attack: 0.002,
    decay: 0.9,
    duration: 1.1,
    strikeNoise: 0.06,
  },
  muyu: {
    partials: [
      { type: 'triangle', ratio: 1, peak: 0.2 },
      { type: 'sine', ratio: 2.2, peak: 0.05 },
    ],
    attack: 0.001,
    decay: 0.18,
    duration: 0.28,
    strikeNoise: 0.15,
    filterFreq: 1600,
  },
  tanggu: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.28 },
      { type: 'triangle', ratio: 1.5, peak: 0.08 },
    ],
    attack: 0.002,
    decay: 0.35,
    duration: 0.45,
    strikeNoise: 0.2,
    filterFreq: 800,
  },
  // 打击 · 西
  xylophone: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.24 },
      { type: 'sine', ratio: 3, peak: 0.08 },
      { type: 'triangle', ratio: 5, peak: 0.03 },
    ],
    attack: 0.002,
    decay: 0.4,
    duration: 0.55,
    strikeNoise: 0.05,
  },
  glockenspiel: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.2 },
      { type: 'sine', ratio: 2.76, peak: 0.1 },
      { type: 'sine', ratio: 5.4, peak: 0.04 },
    ],
    attack: 0.001,
    decay: 0.85,
    duration: 1.05,
  },
  marimba: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.22 },
      { type: 'triangle', ratio: 2, peak: 0.06 },
      { type: 'sine', ratio: 4, peak: 0.03 },
    ],
    attack: 0.003,
    decay: 0.55,
    duration: 0.7,
  },
  timpani: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.3 },
      { type: 'sine', ratio: 1.5, peak: 0.08 },
      { type: 'triangle', ratio: 2, peak: 0.04 },
    ],
    attack: 0.005,
    decay: 0.9,
    duration: 1.1,
    strikeNoise: 0.12,
    filterFreq: 600,
  },
  // 新地域乐器（复用相近音色）
  oud: {
    partials: [
      { type: 'triangle', ratio: 1, peak: 0.18 },
      { type: 'sawtooth', ratio: 1, peak: 0.05 },
      { type: 'sine', ratio: 2, peak: 0.07 },
    ],
    attack: 0.004,
    decay: 0.95,
    duration: 1.1,
    filterFreq: 2600,
  },
  qanun: {
    partials: [
      { type: 'triangle', ratio: 1, peak: 0.2 },
      { type: 'sine', ratio: 2, peak: 0.09 },
      { type: 'sine', ratio: 4, peak: 0.04 },
    ],
    attack: 0.003,
    decay: 1.05,
    duration: 1.25,
  },
  rebab: {
    partials: [
      { type: 'sawtooth', ratio: 1, peak: 0.14 },
      { type: 'sine', ratio: 2, peak: 0.07 },
    ],
    attack: 0.05,
    decay: 0.75,
    duration: 1,
    filterFreq: 1900,
  },
  dan_tranh: {
    partials: [
      { type: 'triangle', ratio: 1, peak: 0.2 },
      { type: 'sine', ratio: 2, peak: 0.08 },
      { type: 'sine', ratio: 3, peak: 0.04 },
    ],
    attack: 0.004,
    decay: 1.15,
    duration: 1.35,
    filterFreq: 3800,
  },
  dan_bau: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.2 },
      { type: 'sine', ratio: 2, peak: 0.05, detune: 12 },
      { type: 'triangle', ratio: 1, peak: 0.06 },
    ],
    attack: 0.02,
    decay: 1.1,
    duration: 1.35,
    filterFreq: 2400,
  },
  ney: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.2 },
      { type: 'sine', ratio: 2, peak: 0.05 },
    ],
    attack: 0.06,
    decay: 0.7,
    duration: 0.95,
    breath: 0.14,
    filterFreq: 3200,
  },
  mijwiz: {
    partials: [
      { type: 'square', ratio: 1, peak: 0.1 },
      { type: 'square', ratio: 1, peak: 0.08, detune: 10 },
      { type: 'sine', ratio: 2, peak: 0.04 },
    ],
    attack: 0.03,
    decay: 0.55,
    duration: 0.8,
    breath: 0.08,
    filterFreq: 2800,
  },
  sao_truc: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.2 },
      { type: 'triangle', ratio: 2, peak: 0.05 },
    ],
    attack: 0.04,
    decay: 0.65,
    duration: 0.9,
    breath: 0.13,
    filterFreq: 4200,
  },
  riq_tone: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.2 },
      { type: 'sine', ratio: 3, peak: 0.08 },
    ],
    attack: 0.002,
    decay: 0.35,
    duration: 0.5,
    strikeNoise: 0.1,
    filterFreq: 5000,
  },
  darbuka_tone: {
    partials: [
      { type: 'sine', ratio: 1, peak: 0.26 },
      { type: 'triangle', ratio: 2, peak: 0.08 },
    ],
    attack: 0.002,
    decay: 0.28,
    duration: 0.4,
    strikeNoise: 0.18,
    filterFreq: 1200,
  },
};

function resolveVoice(instrument: InstrumentId): VoiceProfile {
  return VOICES[instrument] ?? VOICES.piano!;
}

const CN_WUYIN_SCALES: ScaleId[] = ['gong', 'shang', 'jue', 'zhi', 'yu'];

/** 宫商角徵羽：音头略缓、余韵拉长，更接近国乐一音一韵 */
function voiceForScale(voice: VoiceProfile, scale: ScaleId): VoiceProfile {
  if (!CN_WUYIN_SCALES.includes(scale)) return voice;
  const attack = Math.min(0.14, voice.attack * 1.45);
  const decay = voice.decay * 2.25;
  const duration = Math.max(voice.duration * 2.15, attack + decay + 0.25);
  return { ...voice, attack, decay, duration };
}

/** 五声循环/示范曲的音距（秒）：给足余韵再换下一音 */
export const WUYIN_NOTE_GAP_SEC = 1.05;
export const WUYIN_DEMO_DUR_SCALE = 1.75;

function playNoise(
  ctx: AudioContext,
  dest: AudioNode,
  duration: number,
  peak: number,
  filterFreq = 2000,
) {
  const now = ctx.currentTime;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(filterFreq, now);
  filter.Q.setValueAtTime(0.7, now);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(now);
  src.stop(now + duration + 0.02);
}

export function playNote(
  midi: number,
  instrument: InstrumentId = 'piano',
  pitch: PitchAdjust = DEFAULT_PITCH,
  scale: ScaleId = DEFAULT_SCALE,
) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const voice = voiceForScale(resolveVoice(instrument), scale);
    const freq = scaledMidiToHz(midi, scale, pitch);
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(1, now);
    const dest: AudioNode = master;

    if (voice.filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = voice.filterType ?? 'lowpass';
      filter.frequency.setValueAtTime(voice.filterFreq, now);
      filter.Q.setValueAtTime(voice.filterQ ?? 0.7, now);
      master.connect(filter);
      filter.connect(ctx.destination);
    } else {
      master.connect(ctx.destination);
    }

    // 五声：音头到峰值后先短暂保持，再缓收，避免一触即逝
    const isCn = CN_WUYIN_SCALES.includes(scale);
    const sustainHold = isCn ? Math.min(0.45, voice.decay * 0.28) : 0;

    for (const p of voice.partials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = p.type;
      osc.frequency.setValueAtTime(freq * p.ratio, now);
      if (p.detune) osc.detune.setValueAtTime(p.detune, now);
      const peak = Math.max(0.0002, p.peak);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + voice.attack);
      if (sustainHold > 0) {
        gain.gain.setValueAtTime(peak, now + voice.attack + sustainHold);
      }
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + voice.attack + sustainHold + voice.decay,
      );
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + voice.duration);
    }

    if (voice.breath && voice.breath > 0) {
      playNoise(ctx, dest, Math.min(voice.duration, isCn ? 0.55 : 0.35), voice.breath * 0.15, 3500);
    }
    if (voice.strikeNoise && voice.strikeNoise > 0) {
      playNoise(ctx, dest, 0.06, voice.strikeNoise * 0.25, 1800);
    }
  } catch {
    void ensureAudioReady();
  }
}

export type SongNote = { midi: number; dur: number };

export const TWINKLE: SongNote[] = [
  { midi: 60, dur: 0.4 },
  { midi: 60, dur: 0.4 },
  { midi: 67, dur: 0.4 },
  { midi: 67, dur: 0.4 },
  { midi: 69, dur: 0.4 },
  { midi: 69, dur: 0.4 },
  { midi: 67, dur: 0.8 },
  { midi: 65, dur: 0.4 },
  { midi: 65, dur: 0.4 },
  { midi: 64, dur: 0.4 },
  { midi: 64, dur: 0.4 },
  { midi: 62, dur: 0.4 },
  { midi: 62, dur: 0.4 },
  { midi: 60, dur: 0.8 },
];

export async function playSong(
  notes: SongNote[],
  instrument: InstrumentId,
  onNote?: (midi: number, index: number) => void,
  signal?: { cancelled: boolean },
  pitch: PitchAdjust = DEFAULT_PITCH,
  scale: ScaleId = DEFAULT_SCALE,
) {
  await ensureAudioReady();
  for (let i = 0; i < notes.length; i++) {
    if (signal?.cancelled) return;
    const n = notes[i]!;
    onNote?.(n.midi, i);
    playNote(n.midi, instrument, pitch, scale);
    await new Promise((r) => setTimeout(r, n.dur * 1000));
  }
}
