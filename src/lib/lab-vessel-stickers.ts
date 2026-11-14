/**
 * 容器内「固定贴图」样式：每种可装材料对应一种稳定视觉（液体/粉末/金属块/气体等）
 * Key id = 材料 kind，禁止用 index。
 */
import { defOf } from './lab-gear-catalog';

export type FillLook =
  | 'liquid'
  | 'powder'
  | 'metal'
  | 'crystal'
  | 'gas'
  | 'chunk'
  | 'leaf'
  | 'paper'
  | 'oil'
  | 'indicator';

export type VesselStickerDef = {
  /** 稳定 Key id = 材料 kind */
  id: string;
  look: FillLook;
  /** 主色 */
  color: string;
  /** 贴图上的短标签 */
  badge: string;
};

const LOOK_BY_CAT: Record<string, FillLook> = {
  酸: 'liquid',
  碱: 'powder',
  盐与氧化物: 'crystal',
  指示剂: 'indicator',
  气体: 'gas',
  金属单质: 'metal',
  非金属: 'powder',
  日常材料: 'chunk',
};

const OVERRIDE: Record<string, FillLook> = {
  water: 'liquid',
  vinegar: 'liquid',
  acid_hcl: 'liquid',
  acid_h2so4: 'liquid',
  acid_hno3: 'liquid',
  acid_ch3cooh: 'liquid',
  acid_h3po4: 'liquid',
  acid_h2co3: 'liquid',
  base_caoh2: 'liquid',
  base_nh3: 'liquid',
  base_naoh: 'powder',
  soda: 'powder',
  salt: 'crystal',
  salt_cuso4: 'crystal',
  salt_fecl3: 'crystal',
  ethanol: 'liquid',
  ox_h2o2: 'liquid',
  oil: 'oil',
  leaf: 'leaf',
  paper: 'paper',
  wood: 'chunk',
  coin: 'metal',
  sand: 'powder',
  sugar: 'crystal',
  starch: 'powder',
  iron: 'powder',
  el_na: 'metal',
  el_fe: 'metal',
  el_cu: 'metal',
  el_s: 'powder',
  el_c: 'powder',
  el_i: 'crystal',
  ind_pheno: 'indicator',
  ind_litmus: 'indicator',
  ind_methyl: 'indicator',
  ind_uni: 'paper',
};

export function stickerOf(kind: string): VesselStickerDef {
  const d = defOf(kind);
  const look = OVERRIDE[kind] || LOOK_BY_CAT[d.cat] || 'chunk';
  return {
    id: d.id,
    look,
    color: d.color || '#94a3b8',
    badge: d.symbol || d.label.slice(0, 2),
  };
}

export const AUTO_ABSORB_DIST = 78;
