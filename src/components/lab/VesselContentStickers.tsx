/**
 * 容器内固定贴图层：按材料 kind 绘制装入后的样貌（液体/粉末/金属块等）
 */
import { contentKinds, type VesselContent } from '@/lib/lab-gear-catalog';
import { stickerOf, type FillLook } from '@/lib/lab-vessel-stickers';

type Props = {
  /** 容器外形裁切用的 clipPath id（外部已定义） */
  clipId: string;
  contents: Array<string | VesselContent>;
  /** 容器内液体区域大致范围 */
  region: { x: number; y: number; w: number; h: number };
};

export function VesselContentStickers({ clipId, contents, region }: Props) {
  const kinds = contentKinds(contents);
  if (!kinds.length) return null;

  const primary = kinds[kinds.length - 1]!;
  const sticker = stickerOf(primary);
  const level = Math.min(0.92, 0.28 + Math.log2(kinds.length + 1) * 0.2);
  const { x, y, w, h } = region;
  const fillH = h * level;
  const fillY = y + h - fillH;

  return (
    <g clipPath={`url(#${clipId})`} data-sticker-id={sticker.id}>
      <FillBody look={sticker.look} color={sticker.color} x={x} y={fillY} w={w} h={fillH} />
      {/* 多层材料时底部叠一点次要色 */}
      {kinds.length > 1 &&
        kinds.slice(-8, -1).map((k, idx) => {
          const s = stickerOf(k);
          return (
            <circle
              key={`layer-${s.id}-${idx}`}
              cx={x + w * (0.22 + (idx % 4) * 0.16)}
              cy={y + h - 6 - Math.floor(idx / 4) * 5}
              r={3.5}
              fill={s.color}
              opacity={0.55}
            />
          );
        })}
      {/* 固定角标贴图 */}
      <g transform={`translate(${x + w - 14}, ${fillY + 4})`}>
        <rect width="12" height="10" rx="2" fill="#fff" opacity="0.92" stroke="#64748b" strokeWidth="0.6" />
        <text
          x="6"
          y="7.5"
          textAnchor="middle"
          fontSize={sticker.badge.length > 2 ? 4.5 : 5.5}
          fontWeight="700"
          fill="#0f172a"
          fontFamily="Segoe UI, Microsoft YaHei, sans-serif"
        >
          {sticker.badge.length > 4 ? sticker.badge.slice(0, 4) : sticker.badge}
        </text>
      </g>
    </g>
  );
}

function FillBody({
  look,
  color,
  x,
  y,
  w,
  h,
}: {
  look: FillLook;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const cx = x + w / 2;
  const bottom = y + h;

  switch (look) {
    case 'liquid':
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill={color} opacity={0.82} />
          <ellipse cx={cx} cy={y + 2} rx={w * 0.42} ry={3} fill="#fff" opacity={0.35} />
        </g>
      );
    case 'oil':
      return (
        <g>
          <rect x={x} y={y} width={w} height={h * 0.45} fill={color} opacity={0.9} />
          <rect x={x} y={y + h * 0.45} width={w} height={h * 0.55} fill="#7dd3fc" opacity={0.55} />
        </g>
      );
    case 'powder':
      return (
        <g>
          <rect x={x} y={bottom - h * 0.55} width={w} height={h * 0.55} fill={color} opacity={0.9} />
          {[0.2, 0.4, 0.55, 0.7, 0.85].map((t) => (
            <circle
              key={`powder-dot-x${Math.round(t * 100)}`}
              cx={x + w * t}
              cy={bottom - 4 - (t * 7) % 5}
              r={1.4}
              fill="#fff"
              opacity={0.35}
            />
          ))}
        </g>
      );
    case 'crystal':
      return (
        <g>
          <rect x={x} y={bottom - h * 0.5} width={w} height={h * 0.5} fill={color} opacity={0.75} />
          <path
            d={`M${cx - 6} ${bottom - 8} L${cx} ${bottom - 18} L${cx + 6} ${bottom - 8} Z`}
            fill="#fff"
            opacity={0.45}
          />
        </g>
      );
    case 'metal':
      return (
        <g>
          <ellipse cx={cx} cy={bottom - 7} rx={w * 0.28} ry={5} fill={color} stroke="#475569" strokeWidth="0.8" />
          <ellipse cx={cx - 2} cy={bottom - 9} rx={3} ry={1.5} fill="#fff" opacity={0.4} />
        </g>
      );
    case 'gas':
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill={color} opacity={0.35} />
          {[0.25, 0.5, 0.7].map((t) => (
            <circle
              key={`bubble-x${Math.round(t * 100)}`}
              cx={x + w * t}
              cy={y + h * (0.35 + t * 0.2)}
              r={2.2}
              fill="#fff"
              opacity={0.55}
              stroke={color}
              strokeWidth="0.6"
            />
          ))}
        </g>
      );
    case 'leaf':
      return (
        <g>
          <ellipse cx={cx} cy={bottom - 10} rx={8} ry={4} fill={color} />
          <path d={`M${cx - 6} ${bottom - 10} Q${cx} ${bottom - 18} ${cx + 6} ${bottom - 10}`} fill="#166534" opacity={0.5} />
        </g>
      );
    case 'paper':
      return (
        <g>
          <rect x={cx - 7} y={bottom - 14} width={14} height={10} fill={color} stroke="#94a3b8" strokeWidth="0.6" />
          <line x1={cx - 4} y1={bottom - 11} x2={cx + 4} y2={bottom - 11} stroke="#cbd5e1" strokeWidth="0.6" />
        </g>
      );
    case 'indicator':
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill={color} opacity={0.7} />
          <rect x={cx - 5} y={y + 4} width={10} height={4} rx={1} fill="#fff" opacity={0.8} />
        </g>
      );
    default:
      return (
        <g>
          <rect x={cx - 6} y={bottom - 12} width={12} height={8} rx={2} fill={color} stroke="#64748b" strokeWidth="0.7" />
        </g>
      );
  }
}
