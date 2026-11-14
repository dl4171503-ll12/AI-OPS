/**
 * 空白实验室 · 器材与化学物品目录（虚拟教学用，非真实危化操作）
 * 规则：每条器材/试剂以稳定 Key id（kind）标识，禁止用数组下标当 ID。
 */
export type GearDef = {
  /** 稳定 Key id，等同 kind，禁止使用 index */
  id: string;
  kind: string;
  label: string;
  /** 试剂瓶/图标上的短符号 */
  symbol?: string;
  cat: string;
  vessel?: boolean;
  material?: boolean;
  /** 装入容器时的液体/固体颜色 */
  color?: string;
  /** 磁性（可被磁铁吸引） */
  magnetic?: boolean;
  /** 危险提示（虚拟安全教育） */
  caution?: string;
};

export const LAB_CAT_ORDER = [
  '玻璃器皿',
  '工具',
  '加热',
  '电学',
  '光学',
  '测量',
  '金属单质',
  '非金属',
  '酸',
  '碱',
  '盐与氧化物',
  '指示剂',
  '气体',
  '日常材料',
] as const;

export type LabCat = (typeof LAB_CAT_ORDER)[number] | string;

function g(partial: Omit<GearDef, 'id'> & { kind: string }): GearDef {
  return { id: partial.kind, ...partial };
}

export const GEAR_CATALOG: GearDef[] = [
  g({ kind: 'beaker', label: '烧杯', cat: '玻璃器皿', vessel: true }),
  g({ kind: 'flask', label: '锥形瓶', cat: '玻璃器皿', vessel: true }),
  g({ kind: 'tube', label: '试管', cat: '玻璃器皿', vessel: true }),
  g({ kind: 'cylinder', label: '量筒', cat: '玻璃器皿', vessel: true }),
  g({ kind: 'dish', label: '培养皿', cat: '玻璃器皿', vessel: true }),
  g({ kind: 'evap', label: '蒸发皿', cat: '玻璃器皿', vessel: true }),
  g({ kind: 'funnel', label: '漏斗', cat: '玻璃器皿' }),
  g({ kind: 'round_flask', label: '圆底烧瓶', cat: '玻璃器皿', vessel: true }),

  g({ kind: 'dropper', label: '滴管', cat: '工具' }),
  g({ kind: 'thermo', label: '温度计', cat: '工具' }),
  g({ kind: 'stir', label: '玻璃棒', cat: '工具' }),
  g({ kind: 'tweezers', label: '镊子', cat: '工具' }),
  g({ kind: 'spatula', label: '药匙', cat: '工具' }),
  g({ kind: 'clamp', label: '铁架台', cat: '工具' }),

  g({ kind: 'lamp', label: '酒精灯', cat: '加热' }),
  g({ kind: 'tripod', label: '三脚架', cat: '加热' }),
  g({ kind: 'gauze', label: '石棉网', cat: '加热' }),

  g({ kind: 'battery', label: '干电池', cat: '电学' }),
  g({ kind: 'bulb', label: '小灯泡', cat: '电学' }),
  g({ kind: 'switch', label: '开关', cat: '电学' }),
  g({ kind: 'wire', label: '导线', cat: '电学' }),
  g({ kind: 'magnet', label: '磁铁', cat: '电学' }),
  g({ kind: 'ammeter', label: '电流表', cat: '电学' }),

  g({ kind: 'lens', label: '凸透镜', cat: '光学' }),
  g({ kind: 'mirror', label: '平面镜', cat: '光学' }),
  g({ kind: 'prism', label: '三棱镜', cat: '光学' }),
  g({ kind: 'laser', label: '激光笔', cat: '光学' }),

  g({ kind: 'ruler', label: '刻度尺', cat: '测量' }),
  g({ kind: 'balance', label: '天平', cat: '测量' }),
  g({ kind: 'stopwatch', label: '秒表', cat: '测量' }),

  g({ kind: 'el_na', label: '钠', symbol: 'Na', cat: '金属单质', material: true, color: '#c0c0c0', caution: '遇水剧烈反应（虚拟示意）' }),
  g({ kind: 'el_k', label: '钾', symbol: 'K', cat: '金属单质', material: true, color: '#b8b8c8', caution: '比钠更活泼（虚拟示意）' }),
  g({ kind: 'el_mg', label: '镁', symbol: 'Mg', cat: '金属单质', material: true, color: '#d4d4d4' }),
  g({ kind: 'el_al', label: '铝', symbol: 'Al', cat: '金属单质', material: true, color: '#c8cdd2' }),
  g({ kind: 'el_fe', label: '铁', symbol: 'Fe', cat: '金属单质', material: true, color: '#6b7280', magnetic: true }),
  g({ kind: 'el_cu', label: '铜', symbol: 'Cu', cat: '金属单质', material: true, color: '#b87333' }),
  g({ kind: 'el_zn', label: '锌', symbol: 'Zn', cat: '金属单质', material: true, color: '#a8b0b8' }),
  g({ kind: 'el_ca', label: '钙', symbol: 'Ca', cat: '金属单质', material: true, color: '#e8e8e0' }),
  g({ kind: 'el_ag', label: '银', symbol: 'Ag', cat: '金属单质', material: true, color: '#e5e7eb' }),
  g({ kind: 'el_au', label: '金', symbol: 'Au', cat: '金属单质', material: true, color: '#fbbf24' }),
  g({ kind: 'el_pb', label: '铅', symbol: 'Pb', cat: '金属单质', material: true, color: '#64748b' }),
  g({ kind: 'el_sn', label: '锡', symbol: 'Sn', cat: '金属单质', material: true, color: '#94a3b8' }),
  g({ kind: 'el_ni', label: '镍', symbol: 'Ni', cat: '金属单质', material: true, color: '#9ca3af', magnetic: true }),
  g({ kind: 'el_co', label: '钴', symbol: 'Co', cat: '金属单质', material: true, color: '#6366f1', magnetic: true }),
  g({ kind: 'el_mn', label: '锰', symbol: 'Mn', cat: '金属单质', material: true, color: '#78716c' }),
  g({ kind: 'el_cr', label: '铬', symbol: 'Cr', cat: '金属单质', material: true, color: '#a1a1aa' }),
  g({ kind: 'el_ti', label: '钛', symbol: 'Ti', cat: '金属单质', material: true, color: '#cbd5e1' }),
  g({ kind: 'el_ba', label: '钡', symbol: 'Ba', cat: '金属单质', material: true, color: '#d1d5db' }),
  g({ kind: 'el_li', label: '锂', symbol: 'Li', cat: '金属单质', material: true, color: '#e2e8f0' }),
  g({ kind: 'iron', label: '铁屑', symbol: 'Fe*', cat: '金属单质', material: true, color: '#57534e', magnetic: true }),

  g({ kind: 'el_c', label: '碳粉', symbol: 'C', cat: '非金属', material: true, color: '#1f2937' }),
  g({ kind: 'el_s', label: '硫粉', symbol: 'S', cat: '非金属', material: true, color: '#facc15' }),
  g({ kind: 'el_p', label: '红磷', symbol: 'P', cat: '非金属', material: true, color: '#dc2626', caution: '易燃（虚拟）' }),
  g({ kind: 'el_i', label: '碘', symbol: 'I₂', cat: '非金属', material: true, color: '#4c1d95' }),
  g({ kind: 'el_si', label: '硅', symbol: 'Si', cat: '非金属', material: true, color: '#64748b' }),
  g({ kind: 'graphite', label: '石墨', symbol: 'C₉', cat: '非金属', material: true, color: '#374151' }),

  g({ kind: 'acid_hcl', label: '盐酸', symbol: 'HCl', cat: '酸', material: true, color: '#a7f3d0', caution: '腐蚀性（虚拟）' }),
  g({ kind: 'acid_h2so4', label: '硫酸', symbol: 'H₂SO₄', cat: '酸', material: true, color: '#fde68a', caution: '浓硫酸危险（虚拟）' }),
  g({ kind: 'acid_hno3', label: '硝酸', symbol: 'HNO₃', cat: '酸', material: true, color: '#fdba74', caution: '强氧化性（虚拟）' }),
  g({ kind: 'acid_ch3cooh', label: '醋酸', symbol: 'HAc', cat: '酸', material: true, color: '#fef3c7' }),
  g({ kind: 'vinegar', label: '食醋', symbol: '醋', cat: '酸', material: true, color: '#fef9c3' }),
  g({ kind: 'acid_h3po4', label: '磷酸', symbol: 'H₃PO₄', cat: '酸', material: true, color: '#e0e7ff' }),
  g({ kind: 'acid_h2co3', label: '碳酸', symbol: 'H₂CO₃', cat: '酸', material: true, color: '#e0f2fe' }),

  g({ kind: 'base_naoh', label: '氢氧化钠', symbol: 'NaOH', cat: '碱', material: true, color: '#e5e7eb', caution: '强腐蚀（虚拟）' }),
  g({ kind: 'base_koh', label: '氢氧化钾', symbol: 'KOH', cat: '碱', material: true, color: '#f3f4f6' }),
  g({ kind: 'base_caoh2', label: '石灰水', symbol: 'Ca(OH)₂', cat: '碱', material: true, color: '#f8fafc' }),
  g({ kind: 'base_nh3', label: '氨水', symbol: 'NH₃·H₂O', cat: '碱', material: true, color: '#ecfdf5' }),
  g({ kind: 'soda', label: '小苏打', symbol: 'NaHCO₃', cat: '碱', material: true, color: '#f8fafc' }),
  g({ kind: 'base_na2co3', label: '纯碱', symbol: 'Na₂CO₃', cat: '碱', material: true, color: '#f1f5f9' }),

  g({ kind: 'salt', label: '食盐', symbol: 'NaCl', cat: '盐与氧化物', material: true, color: '#f8fafc' }),
  g({ kind: 'salt_cuso4', label: '硫酸铜', symbol: 'CuSO₄', cat: '盐与氧化物', material: true, color: '#38bdf8' }),
  g({ kind: 'salt_feso4', label: '硫酸亚铁', symbol: 'FeSO₄', cat: '盐与氧化物', material: true, color: '#86efac' }),
  g({ kind: 'salt_fecl3', label: '氯化铁', symbol: 'FeCl₃', cat: '盐与氧化物', material: true, color: '#f97316' }),
  g({ kind: 'salt_cacl2', label: '氯化钙', symbol: 'CaCl₂', cat: '盐与氧化物', material: true, color: '#f1f5f9' }),
  g({ kind: 'salt_kno3', label: '硝酸钾', symbol: 'KNO₃', cat: '盐与氧化物', material: true, color: '#fafafa' }),
  g({ kind: 'salt_agno3', label: '硝酸银', symbol: 'AgNO₃', cat: '盐与氧化物', material: true, color: '#f5f5f4' }),
  g({ kind: 'salt_baCl2', label: '氯化钡', symbol: 'BaCl₂', cat: '盐与氧化物', material: true, color: '#fafafa' }),
  g({ kind: 'salt_caco3', label: '碳酸钙', symbol: 'CaCO₃', cat: '盐与氧化物', material: true, color: '#f8fafc' }),
  g({ kind: 'ox_feo', label: '氧化铁', symbol: 'Fe₂O₃', cat: '盐与氧化物', material: true, color: '#b91c1c' }),
  g({ kind: 'ox_cuo', label: '氧化铜', symbol: 'CuO', cat: '盐与氧化物', material: true, color: '#111827' }),
  g({ kind: 'ox_cao', label: '氧化钙', symbol: 'CaO', cat: '盐与氧化物', material: true, color: '#f8fafc' }),
  g({ kind: 'ox_mgo', label: '氧化镁', symbol: 'MgO', cat: '盐与氧化物', material: true, color: '#f1f5f9' }),
  g({ kind: 'ox_h2o2', label: '双氧水', symbol: 'H₂O₂', cat: '盐与氧化物', material: true, color: '#e0f2fe' }),
  g({ kind: 'ethanol', label: '酒精', symbol: 'C₂H₅OH', cat: '盐与氧化物', material: true, color: '#fefce8' }),

  g({ kind: 'ind_pheno', label: '酚酞', symbol: '酚酞', cat: '指示剂', material: true, color: '#fce7f3' }),
  g({ kind: 'ind_litmus', label: '石蕊', symbol: '石蕊', cat: '指示剂', material: true, color: '#c4b5fd' }),
  g({ kind: 'ind_methyl', label: '甲基橙', symbol: '甲基橙', cat: '指示剂', material: true, color: '#fb923c' }),
  g({ kind: 'ind_uni', label: 'pH试纸', symbol: 'pH', cat: '指示剂', material: true, color: '#fef08a' }),

  g({ kind: 'gas_o2', label: '氧气', symbol: 'O₂', cat: '气体', material: true, color: '#bae6fd' }),
  g({ kind: 'gas_h2', label: '氢气', symbol: 'H₂', cat: '气体', material: true, color: '#e0f2fe', caution: '可燃（虚拟）' }),
  g({ kind: 'gas_co2', label: '二氧化碳', symbol: 'CO₂', cat: '气体', material: true, color: '#cbd5e1' }),
  g({ kind: 'gas_n2', label: '氮气', symbol: 'N₂', cat: '气体', material: true, color: '#e2e8f0' }),
  g({ kind: 'gas_cl2', label: '氯气', symbol: 'Cl₂', cat: '气体', material: true, color: '#86efac', caution: '有毒（虚拟）' }),
  g({ kind: 'gas_nh3', label: '氨气', symbol: 'NH₃', cat: '气体', material: true, color: '#d1fae5' }),
  g({ kind: 'gas_so2', label: '二氧化硫', symbol: 'SO₂', cat: '气体', material: true, color: '#fef08a' }),
  g({ kind: 'gas_ch4', label: '甲烷', symbol: 'CH₄', cat: '气体', material: true, color: '#f1f5f9' }),

  g({ kind: 'water', label: '清水', symbol: 'H₂O', cat: '日常材料', material: true, color: '#7dd3fc' }),
  g({ kind: 'sand', label: '沙子', symbol: '沙', cat: '日常材料', material: true, color: '#d6b48c' }),
  g({ kind: 'leaf', label: '绿叶', symbol: '叶', cat: '日常材料', material: true, color: '#4ade80' }),
  g({ kind: 'coin', label: '硬币', symbol: '币', cat: '日常材料', material: true, color: '#ca8a04', magnetic: false }),
  g({ kind: 'wood', label: '小木块', symbol: '木', cat: '日常材料', material: true, color: '#a16207' }),
  g({ kind: 'paper', label: '纸片', symbol: '纸', cat: '日常材料', material: true, color: '#f8fafc' }),
  g({ kind: 'oil', label: '植物油', symbol: '油', cat: '日常材料', material: true, color: '#fde047' }),
  g({ kind: 'sugar', label: '蔗糖', symbol: '糖', cat: '日常材料', material: true, color: '#fafafa' }),
  g({ kind: 'starch', label: '淀粉', symbol: '淀粉', cat: '日常材料', material: true, color: '#f5f5f4' }),
];

export type GearKind = (typeof GEAR_CATALOG)[number]['kind'];

const byKind = new Map(GEAR_CATALOG.map((item) => [item.id, item]));

export function defOf(kind: string): GearDef {
  return byKind.get(kind) || GEAR_CATALOG[0]!;
}

export function colorOf(kind: string): string {
  return defOf(kind).color || '#94a3b8';
}

/** 容器内容物：每份材料自带 Key id，禁止用下标标识 */
export type VesselContent = {
  id: string;
  kind: GearKind;
};

export function newContentId(kind: string): string {
  return `vc-${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function mixFillColor(contents: Array<string | VesselContent>): string | null {
  if (!contents.length) return null;
  const last = contents[contents.length - 1]!;
  const kind = typeof last === 'string' ? last : last.kind;
  return colorOf(kind);
}

export function contentKinds(contents: Array<string | VesselContent>): string[] {
  return contents.map((c) => (typeof c === 'string' ? c : c.kind));
}

export function describeMix(contents: Array<string | VesselContent>, added: string): string {
  const mix = [...contentKinds(contents), added];
  const has = (k: string) => mix.includes(k);

  if (has('vinegar') && has('soda')) return '食醋 + 小苏打 → 冒出二氧化碳气泡！';
  if (has('acid_hcl') && has('soda')) return '盐酸 + 小苏打 → 剧烈冒泡（CO₂）！';
  if (has('acid_hcl') && has('el_zn')) return '锌 + 盐酸 → 产生氢气气泡！';
  if (has('acid_hcl') && has('el_fe')) return '铁 + 盐酸 → 缓慢冒泡，溶液浅绿。';
  if (has('acid_hcl') && has('el_mg')) return '镁 + 盐酸 → 快速冒泡放热！';
  if (has('el_na') && has('water')) return '钠投入水中 → 游动、熔化、冒氢气（虚拟示意，切勿真实操作）！';
  if (has('el_k') && has('water')) return '钾遇水更剧烈（虚拟示意）！请记住：活泼金属不能真的扔进水里。';
  if (has('base_naoh') && has('ind_pheno')) return '酚酞遇碱 → 变红！';
  if (has('base_caoh2') && has('ind_pheno')) return '石灰水 + 酚酞 → 变红。';
  if (has('acid_hcl') && has('ind_pheno')) return '酚酞遇酸 → 仍近无色。';
  if (has('acid_hcl') && has('ind_litmus')) return '石蕊遇酸 → 变红。';
  if (has('base_naoh') && has('ind_litmus')) return '石蕊遇碱 → 变蓝。';
  if (has('salt_cuso4') && has('el_fe')) return '铁丝插入硫酸铜溶液 → 表面析出红色铜！';
  if (has('salt_cuso4') && has('water')) return '硫酸铜溶于水 → 蓝色溶液。';
  if (has('salt') && has('water')) return '食盐溶进清水，溶液变澄清。';
  if (has('sugar') && has('water')) return '蔗糖溶解，得到糖水。';
  if (has('sand') && has('water')) return '沙子沉在水底，没有溶解。';
  if (has('oil') && has('water')) return '油浮在水面上，分层了。';
  if (has('gas_co2') && has('base_caoh2')) return '二氧化碳通入石灰水 → 变浑浊！';
  if (has('el_c') && has('gas_o2')) return '碳在氧气中燃烧（虚拟）→ 生成二氧化碳。';
  if (has('el_s') && has('gas_o2')) return '硫在氧气中燃烧（虚拟）→ 产生刺激性气体。';
  if (has('el_mg') && has('gas_o2')) return '镁条燃烧（虚拟）→ 耀眼白光！';
  if (has('ox_h2o2') && has('el_fe')) return '双氧水遇催化剂（示意）→ 加速分解出氧气。';
  if (has('el_i') && has('starch')) return '碘遇淀粉 → 变蓝！';
  if (has('salt_agno3') && has('acid_hcl')) return '硝酸银 + 盐酸 → 白色氯化银沉淀。';
  if (has('salt_baCl2') && has('acid_h2so4')) return '氯化钡 + 硫酸 → 白色硫酸钡沉淀。';
  if ((has('el_fe') || has('iron')) && has('water') && has('gas_o2')) {
    return '铁、水、氧气共同作用 → 慢慢生锈（示意）。';
  }

  const addedLabel = defOf(added).symbol || defOf(added).label;
  const n = mix.length;
  if (n <= 1) return `装入了「${addedLabel}」。`;
  return `装入「${addedLabel}」（现共 ${n} 份内容）。`;
}

/** 其它玻璃器皿默认容量；烧杯无上限 */
export const OTHER_VESSEL_CONTENT_CAP = 5;

/** 烧杯可装任意非容器物品；其它容器仍只收试剂/材料 */
export function canAbsorbIntoVessel(vesselKind: string, itemKind: string): boolean {
  if (defOf(itemKind).vessel) return false;
  if (vesselKind === 'beaker') return true;
  return Boolean(defOf(itemKind).material);
}

export function appendVesselContents(
  vesselKind: string,
  contents: VesselContent[],
  poured: VesselContent,
): VesselContent[] {
  const next = [...contents, poured];
  if (vesselKind === 'beaker') return next;
  return next.slice(-OTHER_VESSEL_CONTENT_CAP);
}

/** 状态栏内含摘要：烧杯内容多时只展示末尾若干 */
export function formatContentsSummary(contents: VesselContent[]): string {
  if (!contents.length) return '';
  const labels = contents.map((c) => defOf(c.kind).symbol || defOf(c.kind).label);
  if (labels.length <= 8) return labels.join('+');
  const tail = labels.slice(-6).join('+');
  return `共${labels.length}份 · …${tail}`;
}
