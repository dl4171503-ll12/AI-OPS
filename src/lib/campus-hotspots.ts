import type { SubjectId } from './types';
import { SCENES } from './scenes';

/** 学科场景内可点击热点（百分比坐标，相对整幅校园图的内容区，非裁剪后的容器） */
export type CampusHotspot = {
  id: string;
  name: string;
  shortName: string;
  /** 相对图片左上角 0–100 */
  x: number;
  y: number;
  w: number;
  h: number;
  to: string;
  subject?: SubjectId;
  enabled: boolean;
};

export type CampusLifeCard = {
  id: string;
  name: string;
  blurb: string;
  image: string;
  to: string;
  enabled: boolean;
  /** 学科楼卡片时用于试用权限校验 */
  subject?: SubjectId;
};

/**
 * 「我的校园」大楼热点 —— 与 campus-scene-named.png 建筑位置对应。
 * 布局：上排 数学 / 语文 / 英语；下排 科学 / 艺术 / AI中心（原体育位）。
 * 体育中心改到下方「校园生活」卡片。
 */
export const SUBJECT_HOTSPOTS: CampusHotspot[] = [
  { id: 'math', name: '数学楼', shortName: '数学楼', x: 7, y: 10, w: 24, h: 28, to: '/hall/math', subject: 'math', enabled: true },
  { id: 'chinese', name: '语文楼', shortName: '语文楼', x: 36, y: 4, w: 28, h: 30, to: '/hall/chinese', subject: 'chinese', enabled: true },
  { id: 'english', name: '英语楼', shortName: '英语楼', x: 68, y: 10, w: 25, h: 28, to: '/hall/english', subject: 'english', enabled: true },
  { id: 'science', name: '科学楼', shortName: '科学楼', x: 6, y: 48, w: 28, h: 34, to: '/hall/science', subject: 'science', enabled: true },
  { id: 'art', name: '艺术楼', shortName: '艺术楼', x: 37, y: 56, w: 26, h: 32, to: '/hall/art', subject: 'art', enabled: true },
  { id: 'ai', name: 'AI 中心', shortName: 'AI中心', x: 66, y: 48, w: 28, h: 34, to: '/hall/ai', subject: 'ai', enabled: true },
];

export const CAMPUS_LIFE_CARDS: CampusLifeCard[] = [
  {
    id: 'pe',
    name: '体育中心',
    blurb: '阿健老师：运动安全、体能与健康习惯',
    image: SCENES.building.pe || SCENES.classroom.pe,
    to: '/hall/pe',
    subject: 'pe',
    enabled: true,
  },
  {
    id: 'principal',
    name: '校长办公楼',
    blurb: '晨会寄语、学习优先级与成长建议',
    image: SCENES.principal,
    to: '/principal',
    enabled: true,
  },
  {
    id: 'counselor',
    name: '心理咨询室',
    blurb: '谈心、情绪疏导与小树洞',
    image: SCENES.counselor,
    to: '/counselor',
    enabled: true,
  },
  {
    id: 'fun',
    name: '娱乐探索楼',
    blurb: '名著赏析（完成今日任务可解锁）',
    image: SCENES.fun,
    to: '/fun',
    enabled: true,
  },
  {
    id: 'explore',
    name: '探索广场',
    blurb: '十万个为什么，随便逛逛',
    image: SCENES.explore,
    to: '/explore',
    enabled: true,
  },
  {
    id: 'social',
    name: '校际社交广场',
    blurb: '认识其他学校的同学',
    image: SCENES.social,
    to: '/social',
    enabled: true,
  },
];

/** @deprecated 兼容旧引用 */
export const CAMPUS_HOTSPOTS = SUBJECT_HOTSPOTS;
