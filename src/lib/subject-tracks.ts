/**
 * 科目老师分轨：
 * - 语文老师：语文 / 历史 / 地理
 * - 科学老师：科学 / 物理 / 化学 / 生物（含虚拟实验室）
 */
import type { SubjectId } from './types';

export type ChineseTrack = 'chinese' | 'history' | 'geography';
export type ScienceTrack = 'science' | 'physics' | 'chemistry' | 'biology';
export type SubjectTrack = ChineseTrack | ScienceTrack | 'default';

export type TrackDef = {
  id: SubjectTrack;
  label: string;
  short: string;
  blurb: string;
};

export const CHINESE_TRACKS: TrackDef[] = [
  { id: 'chinese', label: '语文', short: '语', blurb: '阅读、作文、古诗文与表达' },
  { id: 'history', label: '历史', short: '史', blurb: '朝代脉络、人物事件与史料阅读' },
  { id: 'geography', label: '地理', short: '地', blurb: '地形气候、区域与地图素养' },
];

export const SCIENCE_TRACKS: TrackDef[] = [
  { id: 'science', label: '科学', short: '科', blurb: '小学科学：物质、生命、地球与实验方法' },
  { id: 'physics', label: '物理', short: '物', blurb: '力学、电学、光学、热学与声学实验' },
  { id: 'chemistry', label: '化学', short: '化', blurb: '物质变化、气体制备、反应与安全' },
  { id: 'biology', label: '生物', short: '生', blurb: '显微观察、细胞、生理与生态' },
];

export function tracksForSubject(subject: SubjectId): TrackDef[] {
  if (subject === 'chinese') return CHINESE_TRACKS;
  if (subject === 'science') return SCIENCE_TRACKS;
  return [];
}

export function defaultTrackForSubject(subject: SubjectId): SubjectTrack {
  if (subject === 'chinese') return 'chinese';
  if (subject === 'science') return 'science';
  return 'default';
}

export function trackLabel(track: SubjectTrack): string {
  const all = [...CHINESE_TRACKS, ...SCIENCE_TRACKS];
  return all.find((t) => t.id === track)?.label || '';
}

/** 注入老师系统提示的分轨说明 */
export function trackPromptBlock(subject: SubjectId, track: SubjectTrack): string {
  if (subject === 'chinese') {
    const map: Record<ChineseTrack, string> = {
      chinese:
        '当前分科=语文。聚焦识字、阅读理解、作文与古诗文；史地仅作跨学科点到为止。',
      history:
        '当前分科=历史（由语文老师兼授）。讲清时间线、因果、人物与史料证据；用语文学科阅读方法读史料。',
      geography:
        '当前分科=地理（由语文老师兼授）。讲清空间分布、气候地形、地图阅读与区域联系；可结合说明文阅读。',
    };
    return map[track as ChineseTrack] || map.chinese;
  }
  if (subject === 'science') {
    const map: Record<ScienceTrack, string> = {
      science:
        '当前分科=科学（小学科学为主）。强调观察、假设、实验与记录；鼓励动手做虚拟实验。',
      physics:
        '当前分科=物理。结合力学/电学/光学等虚拟实验讲清概念与测量；安全第一，先想再做。',
      chemistry:
        '当前分科=化学。结合气体制备、反应现象与物质性质实验；强调实验安全与现象记录。',
      biology:
        '当前分科=生物。结合显微、细胞、生理与生态实验；引导观察结构与生命活动。',
    };
    return map[track as ScienceTrack] || map.science;
  }
  return '';
}

export const TRACK_KB: Record<Exclude<SubjectTrack, 'default'>, string> = {
  chinese: `语文：识字写字、词语、记叙/说明/诗歌阅读、作文表达、古诗文常识。先整体再局部，鼓励口头表达。`,
  history: `历史：中国古代—近现代主线、重要人物与事件、史料辨析、因果与比较。用时间轴与「证据→结论」。`,
  geography: `地理：地球与地图、气候地形水文、中国与世界区域、人口城市与可持续发展。读图说理。`,
  science: `科学：物质的性质与变化、生命世界、地球与宇宙、科学探究（提问→假设→实验→结论）。`,
  physics: `物理：声光力热电与电磁；测量、误差、电路连接、光的反射折射、牛顿运动定律入门。配套虚拟实验。`,
  chemistry: `化学：物质构成、化学变化、气体制取与检验、酸碱盐、质量守恒与反应速率直觉。配套虚拟实验。`,
  biology: `生物：细胞与显微观察、光合作用与呼吸、人体系统、遗传入门、生态系统。配套虚拟实验。`,
};

export function kbForTrack(subject: SubjectId, track: SubjectTrack): string {
  if (track !== 'default' && TRACK_KB[track]) return TRACK_KB[track];
  return '';
}
