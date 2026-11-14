/** 乐器目录：大类 → 国家/文化区（中方优先；不收录日本乐器） */

import {
  CULTURE_META,
  type CultureId,
  type ScaleId,
} from './music-scales';

export type InstrumentFamily = 'string' | 'wind' | 'keyboard' | 'percussion';

/** @deprecated 用 culture；保留兼容别名 */
export type InstrumentRegion = CultureId;

export type InstrumentId =
  // 弦 · 中
  | 'erhu'
  | 'gaohu'
  | 'banhu'
  | 'guzheng'
  | 'pipa'
  | 'yangqin'
  | 'guqin'
  // 弦 · 埃及 / 阿拉伯
  | 'oud'
  | 'qanun'
  | 'rebab'
  // 弦 · 英联邦西方
  | 'violin'
  | 'viola'
  | 'cello'
  | 'double_bass'
  | 'harp'
  // 弦 · 美式
  | 'guitar'
  // 弦 · 越南（无日本乐器）
  | 'dan_tranh'
  | 'dan_bau'
  // 管 · 中
  | 'dizi'
  | 'xiao'
  | 'suona'
  | 'sheng'
  | 'hulusi'
  // 管 · 埃及 / 阿拉伯
  | 'ney'
  | 'mijwiz'
  // 管 · 英联邦西方
  | 'flute'
  | 'clarinet'
  | 'oboe'
  | 'trumpet'
  | 'trombone'
  | 'french_horn'
  // 管 · 美式
  | 'saxophone'
  // 管 · 越南
  | 'sao_truc'
  // 键盘
  | 'accordion_cn'
  | 'piano'
  | 'organ'
  | 'accordion'
  | 'electric_piano'
  // 打击 · 中
  | 'bianzhong'
  | 'qing'
  | 'muyu'
  | 'tanggu'
  // 打击 · 埃及 / 阿拉伯
  | 'riq_tone'
  | 'darbuka_tone'
  // 打击 · 英联邦西方
  | 'xylophone'
  | 'glockenspiel'
  | 'timpani'
  // 打击 · 美式
  | 'marimba';

export type InstrumentDef = {
  id: InstrumentId;
  name: string;
  emoji: string;
  family: InstrumentFamily;
  culture: CultureId;
  blurb: string;
  /** 兼容旧字段 */
  region: CultureId;
};

export const FAMILY_META: Record<
  InstrumentFamily,
  { label: string; emoji: string; order: number }
> = {
  string: { label: '弦乐', emoji: '🎻', order: 0 },
  wind: { label: '管乐', emoji: '🎺', order: 1 },
  keyboard: { label: '键盘', emoji: '🎹', order: 2 },
  percussion: { label: '打击乐', emoji: '🥁', order: 3 },
};

export const REGION_META = Object.fromEntries(
  (Object.keys(CULTURE_META) as CultureId[]).map((id) => [
    id,
    { label: CULTURE_META[id].label, order: CULTURE_META[id].order },
  ]),
) as Record<CultureId, { label: string; order: number }>;

export const INSTRUMENTS: InstrumentDef[] = [
  // —— 弦乐 · 中方 ——
  { id: 'erhu', name: '二胡', emoji: '弦', family: 'string', culture: 'cn', region: 'cn', blurb: '细长歌唱线' },
  { id: 'gaohu', name: '高胡', emoji: '弦', family: 'string', culture: 'cn', region: 'cn', blurb: '更高更亮' },
  { id: 'banhu', name: '板胡', emoji: '弦', family: 'string', culture: 'cn', region: 'cn', blurb: '戏曲明亮声' },
  { id: 'guzheng', name: '古筝', emoji: '筝', family: 'string', culture: 'cn', region: 'cn', blurb: '拨弦涟漪' },
  { id: 'pipa', name: '琵琶', emoji: '拨', family: 'string', culture: 'cn', region: 'cn', blurb: '点状拨弹' },
  { id: 'yangqin', name: '扬琴', emoji: '扬', family: 'string', culture: 'cn', region: 'cn', blurb: '槌击金属感' },
  { id: 'guqin', name: '古琴', emoji: '琴', family: 'string', culture: 'cn', region: 'cn', blurb: '古雅余韵' },
  // —— 弦乐 · 埃及 ——
  { id: 'oud', name: '乌德琴', emoji: '乌', family: 'string', culture: 'egypt', region: 'egypt', blurb: '埃及拨弦' },
  { id: 'qanun', name: '卡农琴', emoji: '卡', family: 'string', culture: 'egypt', region: 'egypt', blurb: '埃及齐特琴' },
  // —— 弦乐 · 阿拉伯 ——
  { id: 'rebab', name: '拉巴卜', emoji: '拉', family: 'string', culture: 'arab', region: 'arab', blurb: '阿拉伯弓弦' },
  // —— 弦乐 · 英联邦/西方 ——
  { id: 'violin', name: '小提琴', emoji: '🎻', family: 'string', culture: 'commonwealth', region: 'commonwealth', blurb: '明亮歌唱' },
  { id: 'viola', name: '中提琴', emoji: '提', family: 'string', culture: 'commonwealth', region: 'commonwealth', blurb: '温暖中音' },
  { id: 'cello', name: '大提琴', emoji: '大', family: 'string', culture: 'commonwealth', region: 'commonwealth', blurb: '浑厚低唱' },
  { id: 'double_bass', name: '低音提琴', emoji: '低', family: 'string', culture: 'commonwealth', region: 'commonwealth', blurb: '沉稳低音' },
  { id: 'harp', name: '竖琴', emoji: '竖', family: 'string', culture: 'commonwealth', region: 'commonwealth', blurb: '轻盈拨弦' },
  // —— 弦乐 · 美式 ——
  { id: 'guitar', name: '吉他', emoji: '🎸', family: 'string', culture: 'us', region: 'us', blurb: '六弦拨响' },
  // —— 弦乐 · 越南（日本乐器不收录） ——
  { id: 'dan_tranh', name: '越南筝', emoji: '越筝', family: 'string', culture: 'vietnam', region: 'vietnam', blurb: '越南拨弦' },
  { id: 'dan_bau', name: '独弦琴', emoji: '独弦', family: 'string', culture: 'vietnam', region: 'vietnam', blurb: '越南独弦' },

  // —— 管乐 · 中方 ——
  { id: 'dizi', name: '笛子', emoji: '笛', family: 'wind', culture: 'cn', region: 'cn', blurb: '清亮带气声' },
  { id: 'xiao', name: '箫', emoji: '箫', family: 'wind', culture: 'cn', region: 'cn', blurb: '柔和悠长' },
  { id: 'suona', name: '唢呐', emoji: '唢', family: 'wind', culture: 'cn', region: 'cn', blurb: '高亢热闹' },
  { id: 'sheng', name: '笙', emoji: '笙', family: 'wind', culture: 'cn', region: 'cn', blurb: '和声吹管' },
  { id: 'hulusi', name: '葫芦丝', emoji: '葫', family: 'wind', culture: 'cn', region: 'cn', blurb: '空灵柔美' },
  // —— 管 · 埃及 ——
  { id: 'ney', name: '奈伊笛', emoji: '奈', family: 'wind', culture: 'egypt', region: 'egypt', blurb: '埃及端吹笛' },
  // —— 管 · 阿拉伯 ——
  { id: 'mijwiz', name: '米日维兹', emoji: '双', family: 'wind', culture: 'arab', region: 'arab', blurb: '阿拉伯双管' },
  // —— 管 · 英联邦/西方 ——
  { id: 'flute', name: '长笛', emoji: '长', family: 'wind', culture: 'commonwealth', region: 'commonwealth', blurb: '轻盈气流' },
  { id: 'clarinet', name: '单簧管', emoji: '单', family: 'wind', culture: 'commonwealth', region: 'commonwealth', blurb: '圆润木管' },
  { id: 'oboe', name: '双簧管', emoji: '双', family: 'wind', culture: 'commonwealth', region: 'commonwealth', blurb: '鼻音歌唱' },
  { id: 'trumpet', name: '小号', emoji: '🎺', family: 'wind', culture: 'commonwealth', region: 'commonwealth', blurb: '明亮铜管' },
  { id: 'trombone', name: '长号', emoji: '长号', family: 'wind', culture: 'commonwealth', region: 'commonwealth', blurb: '滑音厚实' },
  { id: 'french_horn', name: '圆号', emoji: '圆', family: 'wind', culture: 'commonwealth', region: 'commonwealth', blurb: '圆润铜管' },
  // —— 管 · 美式 ——
  { id: 'saxophone', name: '萨克斯', emoji: '🎷', family: 'wind', culture: 'us', region: 'us', blurb: '柔亮金属' },
  // —— 管 · 越南 ——
  { id: 'sao_truc', name: '越南竹笛', emoji: '越笛', family: 'wind', culture: 'vietnam', region: 'vietnam', blurb: '越南竹管' },

  // —— 键盘 ——
  { id: 'accordion_cn', name: '手风琴（中式）', emoji: '风', family: 'keyboard', culture: 'cn', region: 'cn', blurb: '风箱和弦' },
  { id: 'piano', name: '钢琴', emoji: '🎹', family: 'keyboard', culture: 'commonwealth', region: 'commonwealth', blurb: '锤击琴弦' },
  { id: 'organ', name: '管风琴', emoji: '管', family: 'keyboard', culture: 'commonwealth', region: 'commonwealth', blurb: '持续管声' },
  { id: 'accordion', name: '手风琴', emoji: '手风', family: 'keyboard', culture: 'commonwealth', region: 'commonwealth', blurb: '风箱音色' },
  { id: 'electric_piano', name: '电钢琴', emoji: '电', family: 'keyboard', culture: 'us', region: 'us', blurb: '铃感键盘' },

  // —— 打击 ——
  { id: 'bianzhong', name: '编钟', emoji: '钟', family: 'percussion', culture: 'cn', region: 'cn', blurb: '金属悠长' },
  { id: 'qing', name: '磬', emoji: '磬', family: 'percussion', culture: 'cn', region: 'cn', blurb: '清脆石音' },
  { id: 'muyu', name: '木鱼', emoji: '木', family: 'percussion', culture: 'cn', region: 'cn', blurb: '短促木质' },
  { id: 'tanggu', name: '堂鼓', emoji: '鼓', family: 'percussion', culture: 'cn', region: 'cn', blurb: '鼓面低响' },
  { id: 'riq_tone', name: '里克铃鼓音', emoji: '铃', family: 'percussion', culture: 'egypt', region: 'egypt', blurb: '埃及铃鼓音色' },
  { id: 'darbuka_tone', name: '鼓杯音', emoji: '杯', family: 'percussion', culture: 'arab', region: 'arab', blurb: '阿拉伯鼓杯' },
  { id: 'xylophone', name: '木琴', emoji: '木琴', family: 'percussion', culture: 'commonwealth', region: 'commonwealth', blurb: '短亮木音' },
  { id: 'glockenspiel', name: '钟琴', emoji: '钟琴', family: 'percussion', culture: 'commonwealth', region: 'commonwealth', blurb: '叮叮金属' },
  { id: 'timpani', name: '定音鼓', emoji: '定', family: 'percussion', culture: 'commonwealth', region: 'commonwealth', blurb: '可调低鼓' },
  { id: 'marimba', name: '马林巴', emoji: '马', family: 'percussion', culture: 'us', region: 'us', blurb: '温暖木条' },
];

export function instrumentsByFamily(family: InstrumentFamily): InstrumentDef[] {
  return INSTRUMENTS.filter((i) => i.family === family).sort((a, b) => {
    const ro = CULTURE_META[a.culture].order - CULTURE_META[b.culture].order;
    if (ro !== 0) return ro;
    return INSTRUMENTS.indexOf(a) - INSTRUMENTS.indexOf(b);
  });
}

export function getInstrument(id: InstrumentId): InstrumentDef {
  return INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS.find((i) => i.id === 'piano')!;
}

export function defaultScaleForInstrument(id: InstrumentId): ScaleId {
  const inst = getInstrument(id);
  return CULTURE_META[inst.culture].defaultScale;
}

export const DEFAULT_INSTRUMENT: InstrumentId = 'piano';

/** 日本乐器明确不收录 */
export const JAPAN_INSTRUMENTS_BLOCKED_NOTE =
  '本校乐器台不收录、不可学习日本乐器。如需东亚风味，请选用越南乐器，或仅试听「日本调」音程。';
