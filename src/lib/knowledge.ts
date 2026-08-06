import type { SubjectId } from './types';

/** 学科知识骨架：注入 AI 上下文 */
export const SUBJECT_KB: Record<SubjectId, string> = {
  math: `小学/初中数学知识树（节选）：
数与运算→分数小数→比与比例；图形与几何→周长面积体积；统计与概率；代数入门（方程不等式）。
出题要求：步骤清晰，可用 LaTeX（$...$）。`,
  chinese: `语文学科知识树（节选）：
识字写字、词语积累、阅读理解（记叙/说明/诗歌）、作文表达、古诗文常识。
讲解要求：先整体再局部，鼓励口头表达。`,
  english: `英语学科知识树（节选）：
字母语音、核心词汇、基础语法（时态/句型）、听说读写微技能、主题阅读。
讲解要求：中英对照，例句生活化。`,
  science: `科学：物质、生命、地球与宇宙、实验方法。`,
  art: `艺术：色彩、造型、名画欣赏、创意表达。`,
  pe: `体育：运动安全、基础体能、项目规则、名将故事。`,
};

export const MATH_ASSESSMENT_BANK = [
  { id: 'm1', knowledge: '加减法', q: '小明有 23 颗糖，吃了 8 颗，还剩多少颗？', a: '15' },
  { id: 'm2', knowledge: '乘法', q: '每盒有 6 支铅笔，5 盒一共有多少支？', a: '30' },
  { id: 'm3', knowledge: '除法', q: '24 个苹果平均分给 4 个小朋友，每人几个？', a: '6' },
  { id: 'm4', knowledge: '分数', q: '把一个蛋糕平均切成 8 块，吃了 3 块，吃了几分之几？用分数表示。', a: '3/8' },
  { id: 'm5', knowledge: '周长', q: '长 8cm、宽 5cm 的长方形，周长是多少厘米？', a: '26' },
  { id: 'm6', knowledge: '面积', q: '边长 7cm 的正方形，面积是多少平方厘米？', a: '49' },
  { id: 'm7', knowledge: '单位换算', q: '1 米等于多少厘米？', a: '100' },
  { id: 'm8', knowledge: '时间', q: '从上午 9:20 到上午 10:05，经过了多少分钟？', a: '45' },
  { id: 'm9', knowledge: '应用题', q: '一本书 36 元，买 2 本付钱 80 元，应找回多少元？', a: '8' },
  { id: 'm10', knowledge: '比较大小', q: '0.7 和 3/4，哪个更大？请写出较大的那个。', a: '3/4' },
  { id: 'm11', knowledge: '平均数', q: '三次数是 6、8、10，平均数是多少？', a: '8' },
  { id: 'm12', knowledge: '方程入门', q: 'x + 5 = 12，x 等于多少？', a: '7' },
];

export function normalizeAnswer(s: string): string {
  return s.replace(/\s+/g, '').replace(/／/g, '/').toLowerCase();
}

export const INTEREST_ROOMS = [
  { id: 'sports', name: '体育兴趣室', emoji: '🏅', blurb: '运动科普与名将故事', key: 'sports' as const },
  { id: 'art', name: '美术创意室', emoji: '🖌️', blurb: '色彩、名画与创意点子', key: 'art' as const },
  { id: 'music', name: '音乐室', emoji: '🎵', blurb: '乐器入门与节奏游戏', key: 'music' as const },
  { id: 'coding', name: '编程室', emoji: '💻', blurb: 'Scratch 趣味挑战', key: 'coding' as const },
];

export const DECOR_SHOP = [
  { id: '花坛', cost: 30, emoji: '🌸' },
  { id: '喷泉', cost: 30, emoji: '⛲' },
  { id: '旗杆', cost: 30, emoji: '🚩' },
  { id: '图书馆角', cost: 30, emoji: '📚' },
];
