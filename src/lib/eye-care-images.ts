/**
 * 本地护眼放映图：眼球训练示意图（不依赖外网，保证一定能加载）
 * 不再使用视力表或纯场景远眺图作为主放映内容。
 */
export const LOCAL_EYE_CARE_IMAGES = [
  { title: '眼球训练 · 左右远眺', url: '/eye-care/eye-train-left-right.svg', source: 'local' },
  { title: '眼球训练 · 上下远眺', url: '/eye-care/eye-train-up-down.svg', source: 'local' },
  { title: '眼球训练 · 顺时针绕圈', url: '/eye-care/eye-train-circle.svg', source: 'local' },
  { title: '眼球训练 · 远近交替', url: '/eye-care/eye-train-near-far.svg', source: 'local' },
  { title: '眼球训练 · 有意识眨眼', url: '/eye-care/eye-train-blink.svg', source: 'local' },
  { title: '眼球训练 · 画∞字', url: '/eye-care/eye-train-figure8.svg', source: 'local' },
] as const;

export const EYE_CARE_FALLBACK = LOCAL_EYE_CARE_IMAGES[0]!;
