/**
 * 校内虚拟实验室目录（功能借鉴公开虚拟实验教学形态，非商用复制）。
 * 覆盖：小学科学 / 物理 / 化学 / 生物
 */
import type { AgeBand } from './types';
import type { ScienceTrack } from './subject-tracks';

export type LabEngine =
  | 'guided' // 步骤勾选 + 观察问答
  | 'circuit' // 简易电学：电源-开关-灯泡
  | 'optics' // 入射角/反射角
  | 'chem_mix' // 试剂混合看现象
  | 'microscope' // 调焦观察
  | 'measure' // 弹簧测力/杠杆读数
  | 'heat' // 加热升温曲线直觉
  | 'ecology' // 食物链点选
  | 'sandbox'; // 空白实验室：无尽器材自由探索

export type LabStep = {
  id: string;
  text: string;
  hint?: string;
};

export type LabExperiment = {
  id: string;
  track: ScienceTrack;
  title: string;
  emoji: string;
  topic: string;
  /** low=小学偏；mid=初中；high=高中可选 */
  bands: AgeBand[];
  engine: LabEngine;
  goal: string;
  safety: string[];
  steps: LabStep[];
  /** 引擎参数 */
  params?: Record<string, unknown>;
  quiz?: { q: string; a: string; options?: string[] };
};

const phys = (
  partial: Omit<LabExperiment, 'track'> & { track?: ScienceTrack },
): LabExperiment => ({
  track: 'physics',
  ...partial,
});

const chem = (
  partial: Omit<LabExperiment, 'track'> & { track?: ScienceTrack },
): LabExperiment => ({
  track: 'chemistry',
  ...partial,
});

const bio = (
  partial: Omit<LabExperiment, 'track'> & { track?: ScienceTrack },
): LabExperiment => ({
  track: 'biology',
  ...partial,
});

const sci = (
  partial: Omit<LabExperiment, 'track'> & { track?: ScienceTrack },
): LabExperiment => ({
  track: 'science',
  ...partial,
});

/** 全库实验（课堂练习 + 自由开放均可选用） */
export const LAB_EXPERIMENTS: LabExperiment[] = [
  // ── 空白实验室（自由探索入口）──
  sci({
    id: 'lab-blank-sandbox',
    title: '空白实验室',
    emoji: '🥼',
    topic: '自由探索',
    bands: ['low', 'mid', 'high'],
    engine: 'sandbox',
    goal: '台面起初什么都没有——从左侧「无尽实验」拿出器材，自由组合、观察现象。',
    safety: [
      '虚拟实验也请养成安全习惯：加热远离纸屑、电路干燥、试剂不入口',
      '探索结束记得清空台面',
    ],
    steps: [
      { id: '1', text: '从左侧「无尽实验」点击或拖出任意器材到空白台面' },
      { id: '2', text: '拖动器材靠近，试试倒入、加热、接通电路或磁铁吸引' },
      { id: '3', text: '把你发现的有趣现象写在实验记录里' },
    ],
  }),
  // ── 小学科学 ──
  sci({
    id: 'sci-sink-float',
    title: '沉与浮',
    emoji: '🫧',
    topic: '物质性质',
    bands: ['low', 'mid'],
    engine: 'guided',
    goal: '比较不同物体在水中的沉浮，并记录现象。',
    safety: ['不要把电器放进水里', '桌面铺纸巾防洒'],
    steps: [
      { id: '1', text: '准备清水杯与木块、硬币、橡皮泥小球' },
      { id: '2', text: '逐个放入水中，观察沉或浮' },
      { id: '3', text: '把橡皮泥捏成小船再放，观察变化' },
      { id: '4', text: '写下：形状会不会影响浮沉？' },
    ],
    quiz: { q: '把实心橡皮泥捏成船形后更容易？', a: '浮起来', options: ['沉下去', '浮起来', '没变化'] },
  }),
  sci({
    id: 'sci-magnet',
    title: '磁铁吸什么',
    emoji: '🧲',
    topic: '磁',
    bands: ['low', 'mid'],
    engine: 'guided',
    goal: '区分能被磁铁吸引的物体。',
    safety: ['磁铁远离银行卡与手机'],
    steps: [
      { id: '1', text: '准备磁铁、铁钉、塑料尺、铜钥匙（或铜币）、纸片' },
      { id: '2', text: '逐一靠近磁铁并记录是否被吸' },
      { id: '3', text: '归纳：哪些材料通常能被吸引' },
    ],
    quiz: { q: '下列通常能被磁铁吸住的是？', a: '铁钉', options: ['塑料尺', '铁钉', '纸片'] },
  }),
  sci({
    id: 'sci-plant-light',
    title: '植物需要光吗',
    emoji: '🌱',
    topic: '生命',
    bands: ['low', 'mid'],
    engine: 'ecology',
    goal: '理解光对植物生长的作用。',
    safety: ['实验周期长，用虚拟加速观察'],
    steps: [
      { id: '1', text: '选择「有光」与「遮光」两组幼苗' },
      { id: '2', text: '虚拟快进几天，对比叶片颜色与高度' },
      { id: '3', text: '得出结论并记录' },
    ],
    params: { mode: 'light' },
    quiz: { q: '长期完全不见光的绿叶植物会怎样？', a: '变黄变弱', options: ['长得更快', '变黄变弱', '结更多果'] },
  }),
  sci({
    id: 'sci-weather',
    title: '认识天气符号',
    emoji: '⛅',
    topic: '地球',
    bands: ['low'],
    engine: 'guided',
    goal: '认读晴、阴、雨、雪等天气符号。',
    safety: [],
    steps: [
      { id: '1', text: '对照图例认识天气符号' },
      { id: '2', text: '根据今日虚拟天气预报说出穿衣建议' },
    ],
    quiz: { q: '带雨点的云朵符号通常表示？', a: '雨', options: ['晴', '雨', '大风'] },
  }),
  sci({
    id: 'sci-shadow',
    title: '影子的方向',
    emoji: '☀️',
    topic: '光',
    bands: ['low', 'mid'],
    engine: 'optics',
    goal: '观察光源位置与影子方向的关系。',
    safety: ['勿直视强光'],
    steps: [
      { id: '1', text: '放置直立物体' },
      { id: '2', text: '移动光源，观察影子方向与长度' },
      { id: '3', text: '总结：光从哪边来，影子朝哪边' },
    ],
    params: { mode: 'shadow' },
  }),
  sci({
    id: 'sci-dissolve',
    title: '溶解快慢',
    emoji: '🧂',
    topic: '物质变化',
    bands: ['low', 'mid'],
    engine: 'chem_mix',
    goal: '比较搅拌、水温对溶解快慢的影响。',
    safety: ['只用食盐/糖等安全溶质虚拟实验'],
    steps: [
      { id: '1', text: '选择冷水/热水' },
      { id: '2', text: '加入食盐，选择是否搅拌' },
      { id: '3', text: '比较溶解时间' },
    ],
    params: {
      reagents: [
        { id: 'salt', name: '食盐', color: '#e8e8e8' },
        { id: 'cold', name: '冷水', color: '#93c5fd' },
        { id: 'hot', name: '热水', color: '#fda4af' },
      ],
      reactions: {
        'cold+salt': { color: '#bfdbfe', note: '溶解较慢', gas: false },
        'hot+salt': { color: '#bfdbfe', note: '溶解较快', gas: false },
      },
    },
  }),

  // ── 物理 ──
  phys({
    id: 'phy-series-circuit',
    title: '串联电路点亮灯泡',
    emoji: '💡',
    topic: '电学',
    bands: ['mid', 'high'],
    engine: 'circuit',
    goal: '用电源、开关、灯泡组成通路并点亮。',
    safety: ['虚拟电路无触电风险；真实实验需教师指导'],
    steps: [
      { id: '1', text: '将电源、开关、灯泡拖入工作台' },
      { id: '2', text: '按串联顺序连接导线' },
      { id: '3', text: '闭合开关，观察灯泡是否发光' },
      { id: '4', text: '断开开关，观察熄灭' },
    ],
    params: { mode: 'series' },
    quiz: { q: '串联电路中开关断开时灯泡？', a: '熄灭', options: ['仍亮', '熄灭', '更亮'] },
  }),
  phys({
    id: 'phy-parallel-circuit',
    title: '并联电路两灯',
    emoji: '🔌',
    topic: '电学',
    bands: ['mid', 'high'],
    engine: 'circuit',
    goal: '理解并联时一支路断开另一支路仍可工作。',
    safety: ['先画电路图再接线'],
    steps: [
      { id: '1', text: '搭建并联：两灯泡各占一支路' },
      { id: '2', text: '闭合总开关，两灯应亮' },
      { id: '3', text: '模拟拆除一支路灯泡，观察另一灯' },
    ],
    params: { mode: 'parallel' },
  }),
  phys({
    id: 'phy-ohm',
    title: '电流与电压粗测',
    emoji: '📟',
    topic: '电学',
    bands: ['mid', 'high'],
    engine: 'measure',
    goal: '体验电压升高时电流增大的直觉（欧姆定律入门）。',
    safety: ['量程选择要从大到小（真实实验）'],
    steps: [
      { id: '1', text: '设定电阻不变' },
      { id: '2', text: '调节电压滑块，读取电流示数' },
      { id: '3', text: '记录 2～3 组数据' },
    ],
    params: { mode: 'ohm', R: 10 },
  }),
  phys({
    id: 'phy-reflection',
    title: '光的反射定律',
    emoji: '🪞',
    topic: '光学',
    bands: ['mid', 'high'],
    engine: 'optics',
    goal: '验证入射角等于反射角。',
    safety: ['激光笔勿射眼睛（真实场景）'],
    steps: [
      { id: '1', text: '调节入射光线角度' },
      { id: '2', text: '观察法线与反射光线' },
      { id: '3', text: '比较入射角与反射角读数' },
    ],
    params: { mode: 'reflect' },
    quiz: { q: '光的反射中，入射角与反射角？', a: '相等', options: ['入射角更大', '相等', '反射角更大'] },
  }),
  phys({
    id: 'phy-refraction',
    title: '光的折射入门',
    emoji: '🔍',
    topic: '光学',
    bands: ['mid', 'high'],
    engine: 'optics',
    goal: '观察光从空气进入水中时的偏折。',
    safety: [],
    steps: [
      { id: '1', text: '让光线斜射入水面' },
      { id: '2', text: '观察折射光线相对法线的偏向' },
    ],
    params: { mode: 'refract' },
  }),
  phys({
    id: 'phy-spring',
    title: '弹簧测力计读数',
    emoji: '🪝',
    topic: '力学',
    bands: ['mid', 'high'],
    engine: 'measure',
    goal: '认识弹力与形变量的关系（胡克定律直觉）。',
    safety: ['勿超量程拉伸'],
    steps: [
      { id: '1', text: '挂上不同砝码' },
      { id: '2', text: '读出伸长量与示数' },
      { id: '3', text: '感受：砝码越重，伸长越多' },
    ],
    params: { mode: 'spring', k: 50 },
  }),
  phys({
    id: 'phy-lever',
    title: '杠杆平衡',
    emoji: '⚖️',
    topic: '力学',
    bands: ['mid', 'high'],
    engine: 'measure',
    goal: '调节力臂使杠杆平衡。',
    safety: [],
    steps: [
      { id: '1', text: '左侧放固定砝码' },
      { id: '2', text: '移动右侧砝码位置直到平衡' },
      { id: '3', text: '体会：力×力臂' },
    ],
    params: { mode: 'lever' },
  }),
  phys({
    id: 'phy-heat-expand',
    title: '热胀冷缩',
    emoji: '🌡️',
    topic: '热学',
    bands: ['low', 'mid'],
    engine: 'heat',
    goal: '观察升温后液体柱上升。',
    safety: ['真实酒精灯需教师看护'],
    steps: [
      { id: '1', text: '观察初始液柱高度' },
      { id: '2', text: '加热，观察液柱变化' },
      { id: '3', text: '停止加热后冷却对比' },
    ],
  }),
  phys({
    id: 'phy-sound',
    title: '声音的产生',
    emoji: '🔊',
    topic: '声学',
    bands: ['low', 'mid'],
    engine: 'guided',
    goal: '理解声音由振动产生。',
    safety: [],
    steps: [
      { id: '1', text: '拨动虚拟音叉/橡皮筋' },
      { id: '2', text: '观察振动与发声的对应' },
      { id: '3', text: '按住停止振动，听声音消失' },
    ],
    quiz: { q: '声音是由物体什么产生的？', a: '振动', options: ['发光', '振动', '导电'] },
  }),
  phys({
    id: 'phy-magnet-field',
    title: '磁感线与小磁针',
    emoji: '🧭',
    topic: '电磁',
    bands: ['mid', 'high'],
    engine: 'guided',
    goal: '观察小磁针在条形磁铁周围的指向。',
    safety: [],
    steps: [
      { id: '1', text: '放置条形磁铁' },
      { id: '2', text: '在周围放置小磁针观察偏转' },
      { id: '3', text: '画出大致磁场方向示意图' },
    ],
  }),
  phys({
    id: 'phy-convex-lens',
    title: '凸透镜成像直觉',
    emoji: '📷',
    topic: '光学',
    bands: ['mid', 'high'],
    engine: 'optics',
    goal: '移动物距，观察像的大小虚实变化趋势。',
    safety: [],
    steps: [
      { id: '1', text: '物体放在两倍焦距以外' },
      { id: '2', text: '观察倒立缩小实像趋势' },
      { id: '3', text: '移近到焦点内，体会虚像情况' },
    ],
    params: { mode: 'lens' },
  }),

  // ── 化学 ──
  chem({
    id: 'chem-o2',
    title: '氧气的制取与检验',
    emoji: '🫧',
    topic: '气体制备',
    bands: ['mid', 'high'],
    engine: 'chem_mix',
    goal: '虚拟完成加热高锰酸钾制氧并用带火星木条检验。',
    safety: ['真实实验严禁随意加热药品；本课为虚拟'],
    steps: [
      { id: '1', text: '组装发生装置（虚拟）' },
      { id: '2', text: '加热高锰酸钾，用排水法收集' },
      { id: '3', text: '伸入带火星木条，观察复燃' },
    ],
    params: {
      reagents: [
        { id: 'kmno4', name: '高锰酸钾', color: '#7c3aed' },
        { id: 'heat', name: '加热', color: '#f97316' },
        { id: 'splint', name: '带火星木条', color: '#a3a3a3' },
      ],
      reactions: {
        'heat+kmno4': { color: '#22c55e', note: '产生氧气（虚拟）', gas: true },
        'heat+kmno4+splint': { color: '#ef4444', note: '木条复燃 → 有氧气', gas: true },
      },
    },
    quiz: { q: '检验氧气常用？', a: '带火星木条复燃', options: ['澄清石灰水变浑浊', '带火星木条复燃', '肥皂水吹泡'] },
  }),
  chem({
    id: 'chem-co2',
    title: '二氧化碳制取与检验',
    emoji: '🧪',
    topic: '气体制备',
    bands: ['mid', 'high'],
    engine: 'chem_mix',
    goal: '大理石与稀盐酸反应，石灰水检验 CO₂。',
    safety: ['酸液虚拟操作；真实需护目镜'],
    steps: [
      { id: '1', text: '加入大理石与稀盐酸' },
      { id: '2', text: '观察气泡' },
      { id: '3', text: '通入澄清石灰水，观察变浑浊' },
    ],
    params: {
      reagents: [
        { id: 'caco3', name: '大理石', color: '#d6d3d1' },
        { id: 'hcl', name: '稀盐酸', color: '#fde68a' },
        { id: 'lime', name: '澄清石灰水', color: '#f5f5f4' },
      ],
      reactions: {
        'caco3+hcl': { color: '#e7e5e4', note: '产生二氧化碳气泡', gas: true },
        'caco3+hcl+lime': { color: '#e7e5e4', note: '石灰水变浑浊', gas: false },
      },
    },
  }),
  chem({
    id: 'chem-acid-base',
    title: '酸碱指示剂',
    emoji: '🧫',
    topic: '酸碱',
    bands: ['mid', 'high'],
    engine: 'chem_mix',
    goal: '用石蕊/酚酞观察酸碱变色。',
    safety: [],
    steps: [
      { id: '1', text: '分别滴加酸、碱到指示剂' },
      { id: '2', text: '记录颜色变化' },
    ],
    params: {
      reagents: [
        { id: 'acid', name: '稀酸', color: '#fef08a' },
        { id: 'base', name: '稀碱', color: '#cffafe' },
        { id: 'litmus', name: '石蕊', color: '#c4b5fd' },
        { id: 'phen', name: '酚酞', color: '#fecdd3' },
      ],
      reactions: {
        'acid+litmus': { color: '#f87171', note: '石蕊变红', gas: false },
        'base+litmus': { color: '#60a5fa', note: '石蕊变蓝', gas: false },
        'base+phen': { color: '#f472b6', note: '酚酞变红', gas: false },
        'acid+phen': { color: '#fecdd3', note: '酚酞仍无色/淡', gas: false },
      },
    },
  }),
  chem({
    id: 'chem-burn-mg',
    title: '镁条燃烧（虚拟）',
    emoji: '✨',
    topic: '化学变化',
    bands: ['mid', 'high'],
    engine: 'chem_mix',
    goal: '观察剧烈燃烧与白色固体生成（虚拟演示）。',
    safety: ['真实镁条燃烧强光伤眼，必须教师演示'],
    steps: [
      { id: '1', text: '虚拟点燃镁条' },
      { id: '2', text: '观察强光与白色氧化镁' },
    ],
    params: {
      reagents: [
        { id: 'mg', name: '镁条', color: '#a8a29e' },
        { id: 'ignite', name: '点燃', color: '#fb923c' },
      ],
      reactions: {
        'ignite+mg': { color: '#f8fafc', note: '强光 + 白色固体（氧化镁）', gas: false },
      },
    },
  }),
  chem({
    id: 'chem-rate',
    title: '反应快慢（温度）',
    emoji: '⏱️',
    topic: '反应速率',
    bands: ['high', 'mid'],
    engine: 'heat',
    goal: '体会温度升高通常加快反应。',
    safety: [],
    steps: [
      { id: '1', text: '同一反应选低温/高温' },
      { id: '2', text: '比较气泡产生快慢（虚拟）' },
    ],
  }),
  chem({
    id: 'chem-conservation',
    title: '质量守恒直觉',
    emoji: '⚖️',
    topic: '质量守恒',
    bands: ['mid', 'high'],
    engine: 'guided',
    goal: '密闭体系反应前后总质量不变的认识。',
    safety: [],
    steps: [
      { id: '1', text: '虚拟密闭瓶中反应前后称重' },
      { id: '2', text: '对比读数' },
      { id: '3', text: '说出质量守恒定律要点' },
    ],
    quiz: {
      q: '密闭容器内化学反应前后，总质量？',
      a: '不变',
      options: ['变大', '变小', '不变'],
    },
  }),

  // ── 生物 ──
  bio({
    id: 'bio-microscope',
    title: '显微镜观察洋葱表皮',
    emoji: '🔬',
    topic: '显微',
    bands: ['mid', 'high', 'low'],
    engine: 'microscope',
    goal: '练习对光、调焦，辨认细胞壁与细胞核。',
    safety: ['玻片轻拿轻放（真实）'],
    steps: [
      { id: '1', text: '选择低倍镜并对光' },
      { id: '2', text: '粗准焦螺旋找到物像' },
      { id: '3', text: '细准焦螺旋调清晰' },
      { id: '4', text: '指出细胞壁、细胞核' },
    ],
    params: { specimen: 'onion' },
    quiz: { q: '显微镜先用？', a: '低倍镜', options: ['高倍镜', '低倍镜', '油镜'] },
  }),
  bio({
    id: 'bio-photosynthesis',
    title: '光合作用条件',
    emoji: '🍃',
    topic: '生理',
    bands: ['mid', 'high'],
    engine: 'ecology',
    goal: '理解光、叶绿体、二氧化碳与有机物/氧气的关系。',
    safety: [],
    steps: [
      { id: '1', text: '选择有光/无光' },
      { id: '2', text: '观察淀粉检测虚拟结果' },
    ],
    params: { mode: 'photo' },
  }),
  bio({
    id: 'bio-respiration',
    title: '呼吸作用与萌发',
    emoji: '🫘',
    topic: '生理',
    bands: ['mid', 'high'],
    engine: 'ecology',
    goal: '萌发种子消耗氧气、放出二氧化碳的认识。',
    safety: [],
    steps: [
      { id: '1', text: '对比萌发组与煮熟组' },
      { id: '2', text: '观察氧气/二氧化碳虚拟指标' },
    ],
    params: { mode: 'respire' },
  }),
  bio({
    id: 'bio-foodchain',
    title: '食物链排序',
    emoji: '🦊',
    topic: '生态',
    bands: ['low', 'mid'],
    engine: 'ecology',
    goal: '正确排出生产者→初级消费者→次级消费者。',
    safety: [],
    steps: [
      { id: '1', text: '从卡片中选出生产者' },
      { id: '2', text: '排出合理食物链' },
    ],
    params: { mode: 'foodchain' },
    quiz: { q: '食物链起点通常是？', a: '生产者', options: ['分解者', '生产者', '顶级消费者'] },
  }),
  bio({
    id: 'bio-cell',
    title: '动植物细胞对比',
    emoji: '🧬',
    topic: '细胞',
    bands: ['mid', 'high'],
    engine: 'microscope',
    goal: '辨认细胞壁、叶绿体等植物细胞结构。',
    safety: [],
    steps: [
      { id: '1', text: '切换动物细胞/植物细胞标本' },
      { id: '2', text: '标出共有结构与特有结构' },
    ],
    params: { specimen: 'compare' },
  }),
  bio({
    id: 'bio-enzyme',
    title: '酶活性与温度',
    emoji: '🌡️',
    topic: '酶',
    bands: ['high'],
    engine: 'heat',
    goal: '体会最适温度附近酶活性较高。',
    safety: [],
    steps: [
      { id: '1', text: '调节温度滑块' },
      { id: '2', text: '观察反应速率曲线' },
    ],
  }),
];

export function labsForTrack(track: ScienceTrack, band?: AgeBand): LabExperiment[] {
  return LAB_EXPERIMENTS.filter((e) => {
    if (e.track !== track) return false;
    if (band && !e.bands.includes(band)) return false;
    return true;
  });
}

export function labsAll(band?: AgeBand): LabExperiment[] {
  if (!band) return LAB_EXPERIMENTS;
  return LAB_EXPERIMENTS.filter((e) => e.bands.includes(band));
}

export function getLabById(id: string): LabExperiment | undefined {
  return LAB_EXPERIMENTS.find((e) => e.id === id);
}

/** 课后自由实验时长（毫秒） */
export const FREE_LAB_MS = 30 * 60 * 1000;
