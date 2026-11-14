/**
 * 正宗五声（宫商角徵羽）调律：默认三分损益/五度相生，可被双模型考证结果覆盖。
 * 刻意远离十二平均律（西方化）。
 */

export type WuyinDegreeKey = 'gong' | 'shang' | 'jue' | 'zhi' | 'yu';

export type WuyinRatios = Record<WuyinDegreeKey, number>;

export type WuyinCents = Record<WuyinDegreeKey, number>;

export type WuyinAudioRef = {
  title: string;
  url: string;
  note?: string;
  engine?: 'deepseek' | 'kimi' | 'merged';
};

export type WuyinTuningState = {
  method: string;
  ratios: WuyinRatios;
  cents: WuyinCents;
  audioRefs: WuyinAudioRef[];
  source: 'sanfen-default' | 'dual-llm' | 'merged';
  deepseekNote?: string;
  kimiNote?: string;
  updatedAt?: string;
};

/** 三分损益（五度相生）相对宫的频率比 —— 非平均律 */
export const SANFEN_RATIOS: WuyinRatios = {
  gong: 1,
  shang: 9 / 8, // 203.91¢
  jue: 81 / 64, // 407.82¢
  zhi: 3 / 2, // 701.96¢
  yu: 27 / 16, // 905.87¢
};

export function ratiosToCents(ratios: WuyinRatios): WuyinCents {
  const c = (r: number) => Math.round(1200 * Math.log2(r) * 100) / 100;
  return {
    gong: c(ratios.gong),
    shang: c(ratios.shang),
    jue: c(ratios.jue),
    zhi: c(ratios.zhi),
    yu: c(ratios.yu),
  };
}

export const DEFAULT_WUYIN_TUNING: WuyinTuningState = {
  method: '三分损益（五度相生）',
  ratios: { ...SANFEN_RATIOS },
  cents: ratiosToCents(SANFEN_RATIOS),
  audioRefs: [],
  source: 'sanfen-default',
};

const STORAGE_KEY = 'ai-school-wuyin-tuning-v1';

let current: WuyinTuningState = loadInitial();

function loadInitial(): WuyinTuningState {
  try {
    if (typeof localStorage === 'undefined') {
      return { ...DEFAULT_WUYIN_TUNING, ratios: { ...SANFEN_RATIOS }, cents: ratiosToCents(SANFEN_RATIOS) };
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WUYIN_TUNING, ratios: { ...SANFEN_RATIOS }, cents: ratiosToCents(SANFEN_RATIOS) };
    const parsed = JSON.parse(raw) as WuyinTuningState;
    if (!parsed?.ratios?.gong) return { ...DEFAULT_WUYIN_TUNING, ratios: { ...SANFEN_RATIOS } };
    return {
      ...DEFAULT_WUYIN_TUNING,
      ...parsed,
      ratios: { ...SANFEN_RATIOS, ...parsed.ratios },
      cents: parsed.cents || ratiosToCents(parsed.ratios),
    };
  } catch {
    return { ...DEFAULT_WUYIN_TUNING, ratios: { ...SANFEN_RATIOS }, cents: ratiosToCents(SANFEN_RATIOS) };
  }
}

export function getWuyinTuning(): WuyinTuningState {
  return current;
}

export function setWuyinTuning(next: WuyinTuningState) {
  current = {
    ...next,
    ratios: { ...next.ratios },
    cents: next.cents || ratiosToCents(next.ratios),
    audioRefs: next.audioRefs || [],
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  return current;
}

export function resetWuyinTuning() {
  return setWuyinTuning({
    ...DEFAULT_WUYIN_TUNING,
    ratios: { ...SANFEN_RATIOS },
    cents: ratiosToCents(SANFEN_RATIOS),
    audioRefs: [],
  });
}

const DEGREE_ORDER: WuyinDegreeKey[] = ['gong', 'shang', 'jue', 'zhi', 'yu'];

/**
 * 清乐偏音（补全「角→徵」「羽→宫」之间听感缺口）：
 * - 清角 ≈ 纯四度 4/3
 * - 变宫 ≈ 三分损益大七度 243/128
 */
export const PIANYIN_RATIOS = {
  qingjue: 4 / 3,
  biangong: 243 / 128,
} as const;

/** 清乐七声相对宫的 MIDI（C4 起）：宫商角清角徵羽变宫 */
export const QINGYUE_BASE_MIDI = [60, 62, 64, 65, 67, 69, 71] as const;

/** 宫参照 MIDI（C4=60）→ 该音级频率（三分损益比，再加微调） */
export function wuyinDegreeHz(
  degreeIndex: number,
  octaveAdd: number,
  pitch: { semitones: number; cents: number },
  gongMidi = 60,
): number {
  const key = DEGREE_ORDER[((degreeIndex % 5) + 5) % 5]!;
  const ratio = current.ratios[key] * 2 ** octaveAdd;
  const a4 = 440;
  const gongHz = a4 * 2 ** ((gongMidi - 69) / 12);
  const bend = pitch.semitones + pitch.cents / 100;
  return gongHz * ratio * 2 ** (bend / 12);
}

function pianyinHz(
  kind: keyof typeof PIANYIN_RATIOS,
  octaveAdd: number,
  pitch: { semitones: number; cents: number },
  gongMidi = 60,
): number {
  const a4 = 440;
  const gongHz = a4 * 2 ** ((gongMidi - 69) / 12);
  const bend = pitch.semitones + pitch.cents / 100;
  return gongHz * PIANYIN_RATIOS[kind] * 2 ** octaveAdd * 2 ** (bend / 12);
}

/** 清乐七声（含偏音）MIDI → Hz；非清乐键回退 null */
export function wuyinMidiToHz(
  midi: number,
  pitch: { semitones: number; cents: number },
): number | null {
  const m = Math.round(midi);
  for (let oct = -1; oct <= 3; oct++) {
    for (let d = 0; d < QINGYUE_BASE_MIDI.length; d++) {
      if (QINGYUE_BASE_MIDI[d]! + oct * 12 !== m) continue;
      // 正声索引映射：0宫 1商 2角 3清角 4徵 5羽 6变宫
      if (d === 3) return pianyinHz('qingjue', oct, pitch, 60);
      if (d === 6) return pianyinHz('biangong', oct, pitch, 60);
      const zhengIndex = d < 3 ? d : d - 1; // 4→3徵, 5→4羽
      return wuyinDegreeHz(zhengIndex, oct, pitch, 60);
    }
  }
  return null;
}

/** 把任意 MIDI 吸附到最近的清乐音级（示范曲移调后不出现缺级外音） */
export function snapMidiToQingyue(midi: number): number {
  const m = Math.round(midi);
  let best = 60;
  let bestDist = Infinity;
  for (let oct = -1; oct <= 3; oct++) {
    for (const base of QINGYUE_BASE_MIDI) {
      const cand = base + oct * 12;
      const dist = Math.abs(cand - m);
      if (dist < bestDist) {
        bestDist = dist;
        best = cand;
      }
    }
  }
  return best;
}

/** 吸附到正声五声（主音阶）；不吸附到清角/变宫黑键 */
export function snapMidiToWuyinZheng(midi: number): number {
  const BASE = [60, 62, 64, 67, 69];
  const m = Math.round(midi);
  let best = 60;
  let bestDist = Infinity;
  for (let oct = -1; oct <= 3; oct++) {
    for (const base of BASE) {
      const cand = base + oct * 12;
      const dist = Math.abs(cand - m);
      if (dist < bestDist) {
        bestDist = dist;
        best = cand;
      }
    }
  }
  return best;
}

/** 由五声+偏音音分生成 12 律表 */
export function buildChromaticFromWuyinCents(cents: WuyinCents): number[] {
  const qj = Math.round(1200 * Math.log2(PIANYIN_RATIOS.qingjue) * 100) / 100;
  const bg = Math.round(1200 * Math.log2(PIANYIN_RATIOS.biangong) * 100) / 100;
  const anchors: Array<{ pc: number; c: number }> = [
    { pc: 0, c: cents.gong },
    { pc: 2, c: cents.shang },
    { pc: 4, c: cents.jue },
    { pc: 5, c: qj },
    { pc: 7, c: cents.zhi },
    { pc: 9, c: cents.yu },
    { pc: 11, c: bg },
  ];
  const table: number[] = [];
  for (let pc = 0; pc < 12; pc++) {
    const exact = anchors.find((a) => a.pc === pc);
    if (exact) {
      table.push(exact.c);
      continue;
    }
    const lower = [...anchors].reverse().find((a) => a.pc < pc) || { pc: -1, c: bg - 1200 };
    const upper = anchors.find((a) => a.pc > pc) || { pc: 12, c: cents.gong + 1200 };
    const t = (pc - lower.pc) / (upper.pc - lower.pc || 1);
    table.push(Math.round((lower.c + (upper.c - lower.c) * t) * 100) / 100);
  }
  return table;
}

export function formatWuyinCentsLine(cents: WuyinCents): string {
  return `宫 ${cents.gong}¢ · 商 ${cents.shang}¢ · 角 ${cents.jue}¢ · 徵 ${cents.zhi}¢ · 羽 ${cents.yu}¢（偏音黑键另计）`;
}
