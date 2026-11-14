/**
 * 地域调式：中方宫商角徵羽、埃及/阿拉伯、凯瑟尔、美式摇滚松弛、越南/日本微音程
 * 五声优先三分损益比值（非西方十二平均律）。
 */
import {
  buildChromaticFromWuyinCents,
  getWuyinTuning,
  snapMidiToWuyinZheng,
  wuyinMidiToHz,
} from './wuyin-tuning';

export type ScaleId =
  | 'gong'
  | 'shang'
  | 'jue'
  | 'zhi'
  | 'yu'
  | 'egyptian'
  | 'arabic'
  | 'kaiser'
  | 'us_rock'
  | 'vietnam'
  | 'japan';

export type CultureId = 'cn' | 'egypt' | 'arab' | 'commonwealth' | 'us' | 'vietnam';

export type ScaleDef = {
  id: ScaleId;
  name: string;
  /** 拼音标注（有则显示） */
  pinyin?: string;
  blurb: string;
  /** 埃及调族下的阿拉伯分支等 */
  group?: 'egypt_family' | 'cn_wuyin' | 'west' | 'sea';
};

/** 十二律相对 C 的音分；未列出的键用邻音插值思路时直接给满 12 项 */
export const SCALE_CENTS: Record<ScaleId, number[]> = {
  // 五声：宫为默认；商角徵羽为旋转色彩（仍落在钢琴键位上）
  gong: [0, 90, 200, 310, 400, 520, 610, 700, 810, 900, 1010, 1105],
  shang: [0, 110, 200, 320, 430, 500, 620, 700, 820, 900, 1030, 1110],
  jue: [0, 100, 180, 300, 400, 530, 600, 700, 800, 920, 1000, 1120],
  zhi: [0, 100, 200, 300, 420, 500, 630, 700, 800, 900, 1020, 1100],
  yu: [0, 120, 200, 340, 400, 550, 620, 700, 840, 900, 1040, 1110],
  // 埃及调：增二度色彩
  egyptian: [0, 100, 250, 400, 500, 700, 800, 950, 1000, 1100, 1150, 1185],
  // 阿拉伯调：与埃及略异，偏柔、音分更「黏」
  arabic: [0, 150, 300, 450, 500, 700, 850, 900, 1000, 1050, 1150, 1180],
  // 凯瑟尔：十二平均律（英联邦/多数西方默认）
  kaiser: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100],
  // 美式：小三/小七略降，偏摇滚松弛
  us_rock: [0, 100, 200, 280, 400, 500, 600, 700, 800, 900, 980, 1100],
  // 越南小国调：音程偏密
  vietnam: [0, 75, 155, 260, 380, 500, 620, 740, 850, 960, 1070, 1145],
  // 日本调：更密、略邪魅；仅作调式，不收录日本乐器
  japan: [0, 65, 140, 240, 360, 490, 610, 730, 860, 970, 1085, 1160],
};

/** 把考证后的五声十二律表写入宫商角徵羽 */
export function applyWuyinChromaticTables(table: number[]) {
  if (!table || table.length < 12) return;
  const copy = table.slice(0, 12);
  SCALE_CENTS.gong = [...copy];
  SCALE_CENTS.shang = [...copy];
  SCALE_CENTS.jue = [...copy];
  SCALE_CENTS.zhi = [...copy];
  SCALE_CENTS.yu = [...copy];
}

// 启动时用当前调律（默认三分损益或本地考证缓存）覆盖五声表
try {
  applyWuyinChromaticTables(buildChromaticFromWuyinCents(getWuyinTuning().cents));
} catch {
  /* ignore */
}

/** 宫商角徵羽 · 汉字 + 音节 + 本调声调（1–4） */
export const WUYIN_DEGREES = [
  { id: 'gong' as const, han: '宫', syllable: 'gong', tone: 1 },
  { id: 'shang' as const, han: '商', syllable: 'shang', tone: 1 },
  { id: 'jue' as const, han: '角', syllable: 'jue', tone: 2 },
  { id: 'zhi' as const, han: '徵', syllable: 'zhi', tone: 3 },
  { id: 'yu' as const, han: '羽', syllable: 'yu', tone: 3 },
] as const;

/** 偏音（黑键小调，不入主音阶）：清角、变宫 */
export const WUYIN_PIANYIN = [
  {
    id: 'qingjue' as const,
    han: '清角',
    syllable: 'jiao',
    tone: 3,
    midiPc: 65,
    afterZheng: 'jue' as const,
    pinyinPrefix: 'qīng',
  },
  {
    id: 'biangong' as const,
    han: '变宫',
    syllable: 'gong',
    tone: 4,
    midiPc: 71,
    afterZheng: 'yu' as const,
    pinyinPrefix: 'biàn',
  },
] as const;

export type WuyinDegreeId = (typeof WUYIN_DEGREES)[number]['id'];

const TONE_MARKS: Record<1 | 2 | 3 | 4, Record<string, string>> = {
  1: { a: 'ā', e: 'ē', i: 'ī', o: 'ō', u: 'ū', ü: 'ǖ', v: 'ǖ' },
  2: { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', ü: 'ǘ', v: 'ǘ' },
  3: { a: 'ǎ', e: 'ě', i: 'ǐ', o: 'ǒ', u: 'ǔ', ü: 'ǚ', v: 'ǚ' },
  4: { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', ü: 'ǜ', v: 'ǜ' },
};

/** 给无调号音节加声调；升序时声调可上移（1→2→3→4） */
export function applyTone(syllable: string, tone: number): string {
  const t = (Math.max(1, Math.min(4, Math.round(tone))) || 1) as 1 | 2 | 3 | 4;
  const marks = TONE_MARKS[t];
  const lower = syllable.toLowerCase();
  // 优先 a o e，再 iu/ui 规则简化：找第一个元音核
  const order = ['a', 'o', 'e', 'iu', 'ui', 'i', 'u', 'ü', 'v'] as const;
  for (const key of order) {
    if (key === 'iu' && lower.includes('iu')) {
      return lower.replace('iu', `i${marks.u}`);
    }
    if (key === 'ui' && lower.includes('ui')) {
      return lower.replace('ui', `u${marks.i}`);
    }
    if (key.length === 1 && lower.includes(key)) {
      return lower.replace(key, marks[key]!);
    }
  }
  return lower;
}

/**
 * 调高升高时，拼音声调同步「升序」：
 * - 每升高约 2 个半音，声调 +1（封顶 4 声）
 * - 音分正值也计入
 */
export function pitchRaiseSteps(pitch: { semitones: number; cents: number }): number {
  const total = pitch.semitones + pitch.cents / 100;
  if (total <= 0) return 0;
  return Math.min(3, Math.floor(total / 2));
}

export function formatWuyinPinyin(
  syllable: string,
  baseTone: number,
  pitch: { semitones: number; cents: number },
  octaveUp = false,
): string {
  let tone = baseTone + pitchRaiseSteps(pitch);
  if (octaveUp) tone += 1; // 高八度再升一档声调观感
  return applyTone(syllable, tone);
}

/** 以宫=C4(60) 为绝对参照的五声 MIDI */
export const WUYIN_BASE_MIDI = [60, 62, 64, 67, 69] as const; // 宫商角徵羽

export function wuyinModeStartIndex(scaleId: ScaleId): number {
  const i = WUYIN_DEGREES.findIndex((d) => d.id === scaleId);
  return i >= 0 ? i : 0;
}

/** 该调主音（起始音）的绝对 MIDI：商调=商、角调=角… */
export function wuyinTonicMidi(scaleId: ScaleId): number {
  return WUYIN_BASE_MIDI[wuyinModeStartIndex(scaleId)]!;
}

function zhengIdFromMidi(midi: number): WuyinDegreeId | null {
  const m = Math.round(midi);
  for (let oct = -1; oct <= 3; oct++) {
    for (let d = 0; d < 5; d++) {
      if (WUYIN_BASE_MIDI[d]! + oct * 12 === m) return WUYIN_DEGREES[d]!.id;
    }
  }
  return null;
}

/**
 * 主音阶白键：五声 + 高八度主音收尾（六键）
 * 例：宫调 = 宫商角徵羽宫↑
 */
export function wuyinKeyLabels(
  scaleId: ScaleId,
  pitch: { semitones: number; cents: number },
): Array<{ midi: number; han: string; pinyin: string; label: string; kind: 'zheng' }> {
  const rot = wuyinModeStartIndex(scaleId);
  const keys: Array<{ midi: number; han: string; pinyin: string; label: string; kind: 'zheng' }> =
    [];
  for (let i = 0; i < 6; i++) {
    const absStep = rot + i;
    const degIndex = absStep % 5;
    const octaveAdd = Math.floor(absStep / 5);
    const deg = WUYIN_DEGREES[degIndex]!;
    const midi = WUYIN_BASE_MIDI[degIndex]! + octaveAdd * 12;
    const octaveUp = octaveAdd > 0;
    const pinyin = formatWuyinPinyin(deg.syllable, deg.tone, pitch, octaveUp);
    const han = octaveUp ? `${deg.han}↑` : deg.han;
    keys.push({
      midi,
      han,
      pinyin,
      label: `${han}\n${pinyin}`,
      kind: 'zheng',
    });
  }
  return keys;
}

/**
 * 偏音黑键（小调装饰音，不入主音阶循环）：
 * 清角在角→徵之间，变宫在羽→宫之间（随当前调白键位置摆放）
 */
export function wuyinBlackKeyLabels(
  scaleId: ScaleId,
  pitch: { semitones: number; cents: number },
): Array<{
  midi: number;
  han: string;
  pinyin: string;
  leftPct: number;
  kind: 'pian';
}> {
  const whites = wuyinKeyLabels(scaleId, pitch);
  const n = whites.length;
  const blacks: Array<{
    midi: number;
    han: string;
    pinyin: string;
    leftPct: number;
    kind: 'pian';
  }> = [];

  for (let i = 0; i < n - 1; i++) {
    const a = whites[i]!;
    const b = whites[i + 1]!;
    const idA = zhengIdFromMidi(a.midi);
    const idB = zhengIdFromMidi(b.midi);
    for (const pian of WUYIN_PIANYIN) {
      const nextZheng =
        pian.afterZheng === 'jue'
          ? 'zhi'
          : pian.afterZheng === 'yu'
            ? 'gong'
            : null;
      if (idA !== pian.afterZheng || idB !== nextZheng) continue;
      const baseZhengMidi = pian.afterZheng === 'jue' ? 64 : 69;
      const oct = Math.round((a.midi - baseZhengMidi) / 12);
      const midi = pian.midiPc + oct * 12;
      const py = `${pian.pinyinPrefix}${formatWuyinPinyin(pian.syllable, pian.tone, pitch)}`;
      // 黑键居中落在两白键缝隙（类似钢琴）
      const leftPct = ((i + 1) / n) * 100 - 4.25;
      blacks.push({ midi, han: pian.han, pinyin: py, leftPct, kind: 'pian' });
    }
  }
  return blacks;
}

export const SCALE_DEFS: ScaleDef[] = [
  { id: 'gong', name: '宫调', pinyin: 'gōng', blurb: '主音阶：宫商角徵羽宫↑ · 偏音在黑键', group: 'cn_wuyin' },
  { id: 'shang', name: '商调', pinyin: 'shāng', blurb: '主音阶：商角徵羽宫商↑ · 偏音在黑键', group: 'cn_wuyin' },
  { id: 'jue', name: '角调', pinyin: 'jué', blurb: '主音阶：角徵羽宫商角↑ · 偏音在黑键', group: 'cn_wuyin' },
  { id: 'zhi', name: '徵调', pinyin: 'zhǐ', blurb: '主音阶：徵羽宫商角徵↑ · 偏音在黑键', group: 'cn_wuyin' },
  { id: 'yu', name: '羽调', pinyin: 'yǔ', blurb: '主音阶：羽宫商角徵羽↑ · 偏音在黑键', group: 'cn_wuyin' },
  { id: 'egyptian', name: '埃及调', blurb: '埃及优先 · 增二度色彩', group: 'egypt_family' },
  { id: 'arabic', name: '阿拉伯调', blurb: '埃及调族 · 略更柔黏', group: 'egypt_family' },
  { id: 'kaiser', name: '凯瑟尔调', blurb: '英联邦/多数西方默认', group: 'west' },
  { id: 'us_rock', name: '美式松弛调', blurb: '偏摇滚 · 轻松松弛', group: 'west' },
  { id: 'vietnam', name: '越南小国调', blurb: '音程较密', group: 'sea' },
  { id: 'japan', name: '日本调', blurb: '音程更密 · 仅调式试听', group: 'sea' },
];

export const CULTURE_META: Record<
  CultureId,
  { label: string; order: number; defaultScale: ScaleId; blurb: string }
> = {
  cn: { label: '中方', order: 0, defaultScale: 'gong', blurb: '五声主音阶 + 黑键偏音' },
  egypt: { label: '埃及', order: 1, defaultScale: 'egyptian', blurb: '优先埃及调' },
  arab: { label: '阿拉伯', order: 2, defaultScale: 'arabic', blurb: '优先阿拉伯调' },
  commonwealth: { label: '英联邦/西方', order: 3, defaultScale: 'kaiser', blurb: '优先凯瑟尔调' },
  us: { label: '美式', order: 4, defaultScale: 'us_rock', blurb: '优先美式松弛调' },
  vietnam: { label: '越南', order: 5, defaultScale: 'vietnam', blurb: '优先越南小国调；日本乐器不收录' },
};

/** 某文化下可选的调式（日本调挂在越南区供试听，不提供日本乐器） */
export function scalesForCulture(culture: CultureId): ScaleId[] {
  switch (culture) {
    case 'cn':
      return ['gong', 'shang', 'jue', 'zhi', 'yu'];
    case 'egypt':
      return ['egyptian', 'arabic'];
    case 'arab':
      return ['arabic', 'egyptian'];
    case 'commonwealth':
      return ['kaiser', 'us_rock'];
    case 'us':
      return ['us_rock', 'kaiser'];
    case 'vietnam':
      return ['vietnam', 'japan'];
    default:
      return ['kaiser'];
  }
}

export function getScaleDef(id: ScaleId): ScaleDef {
  return SCALE_DEFS.find((s) => s.id === id) ?? SCALE_DEFS[0]!;
}

/** MIDI → Hz（调式音分 + 半音/音分微调） */
export function scaledMidiToHz(
  midi: number,
  scaleId: ScaleId,
  pitch: { semitones: number; cents: number },
): number {
  // 中方：正声五声为主；清角/变宫仅在黑键精确按下时发声，其余外音吸附到五声
  if (['gong', 'shang', 'jue', 'zhi', 'yu'].includes(scaleId)) {
    const exact = wuyinMidiToHz(midi, pitch);
    if (exact != null) return exact;
    const snapped = snapMidiToWuyinZheng(midi);
    const w = wuyinMidiToHz(snapped, pitch);
    if (w != null) return w;
  }
  const pc = ((Math.round(midi) % 12) + 12) % 12;
  const cOfOctave = Math.round(midi) - pc;
  const table = SCALE_CENTS[scaleId] ?? SCALE_CENTS.kaiser;
  const degreeCents = table[pc] ?? pc * 100;
  const a4 = 440;
  const cHz = a4 * 2 ** ((cOfOctave - 69) / 12);
  const scaleHz = cHz * 2 ** (degreeCents / 1200);
  const bend = pitch.semitones + pitch.cents / 100;
  return scaleHz * 2 ** (bend / 12);
}

export const WHITE_KEY_LABELS_GONG = ['宫', '商', '角', '徵', '羽', '宫↑'] as const;

/** 调式按钮文案：汉字 + 拼音 */
export function scaleButtonLabel(def: ScaleDef, pitch?: { semitones: number; cents: number }): string {
  if (!def.pinyin && !['gong', 'shang', 'jue', 'zhi', 'yu'].includes(def.id)) {
    return def.name;
  }
  const deg = WUYIN_DEGREES.find((d) => d.id === def.id);
  if (!deg) return def.pinyin ? `${def.name} ${def.pinyin}` : def.name;
  const py = formatWuyinPinyin(deg.syllable, deg.tone, pitch ?? { semitones: 0, cents: 0 });
  return `${def.name} ${py}`;
}
