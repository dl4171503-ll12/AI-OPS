/**
 * 实验室器材 / 试剂独立 SVG 图标；容器支持「空」与固定装入贴图。
 * SVG clipPath 与列表 key 一律使用稳定 Key id，禁止用数组下标当 ID。
 */
import { useId } from 'react';
import { contentKinds, defOf, type VesselContent } from '@/lib/lab-gear-catalog';
import { VesselContentStickers } from '@/components/lab/VesselContentStickers';

type Props = {
  kind: string;
  contents?: Array<string | VesselContent>;
  lit?: boolean;
  hot?: boolean;
  size?: number;
  className?: string;
};

export function LabGearIcon({ kind, contents = [], lit, hot, size = 40, className = '' }: Props) {
  const reactId = useId().replace(/:/g, '');
  const d = defOf(kind);
  const kinds = contentKinds(contents);
  const filled = kinds.length > 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-label={d.label}
      role="img"
      data-gear-id={d.id}
    >
      <title>
        {d.label}
        {filled ? '（已装入）' : d.vessel ? '（空）' : ''}
        {kinds.length ? ` · ${kinds.map((k) => defOf(k).symbol || defOf(k).label).join('+')}` : ''}
      </title>
      {renderIcon(kind, {
        contents,
        lit: !!lit,
        hot: !!hot,
        symbol: d.symbol || d.label.slice(0, 2),
        color: d.color,
        clipKey: `gear-${d.id}-${reactId}`,
      })}
    </svg>
  );
}

type DrawCtx = {
  contents: Array<string | VesselContent>;
  lit: boolean;
  hot: boolean;
  symbol: string;
  color?: string;
  clipKey: string;
};

function renderIcon(kind: string, ctx: DrawCtx) {
  switch (kind) {
    case 'beaker':
      return <Beaker {...ctx} />;
    case 'flask':
      return <Flask {...ctx} />;
    case 'tube':
      return <Tube {...ctx} />;
    case 'cylinder':
      return <Cylinder {...ctx} />;
    case 'dish':
      return <Dish {...ctx} />;
    case 'evap':
      return <Evap {...ctx} />;
    case 'funnel':
      return <Funnel />;
    case 'round_flask':
      return <RoundFlask {...ctx} />;
    case 'dropper':
      return <Dropper />;
    case 'thermo':
      return <Thermo hot={ctx.hot} />;
    case 'stir':
      return <Stir />;
    case 'tweezers':
      return <Tweezers />;
    case 'spatula':
      return <Spatula />;
    case 'clamp':
      return <Clamp />;
    case 'lamp':
      return <Lamp />;
    case 'tripod':
      return <Tripod />;
    case 'gauze':
      return <Gauze />;
    case 'battery':
      return <Battery />;
    case 'bulb':
      return <Bulb lit={ctx.lit} />;
    case 'switch':
      return <Switch on={ctx.lit} />;
    case 'wire':
      return <Wire />;
    case 'magnet':
      return <Magnet />;
    case 'ammeter':
      return <Ammeter />;
    case 'lens':
      return <Lens />;
    case 'mirror':
      return <Mirror />;
    case 'prism':
      return <Prism />;
    case 'laser':
      return <Laser />;
    case 'ruler':
      return <Ruler />;
    case 'balance':
      return <Balance />;
    case 'stopwatch':
      return <Stopwatch />;
    default: {
      const d = defOf(kind);
      if (d.cat === '气体') return <GasBottle symbol={ctx.symbol} color={ctx.color || '#94a3b8'} />;
      return <ReagentBottle symbol={ctx.symbol} color={ctx.color || '#94a3b8'} />;
    }
  }
}

function Beaker({ contents, hot, clipKey }: DrawCtx) {
  const clipId = `${clipKey}-beaker`;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d="M18 14 L18 50 Q18 56 32 56 Q46 56 46 50 L46 14 Z" />
        </clipPath>
      </defs>
      <VesselContentStickers clipId={clipId} contents={contents} region={{ x: 18, y: 14, w: 28, h: 42 }} />
      <path
        d="M16 12 H48 M18 12 L18 50 Q18 58 32 58 Q46 58 46 50 L46 12"
        fill="none"
        stroke="#64748b"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M22 22 H28 M22 30 H28 M22 38 H28" stroke="#94a3b8" strokeWidth="1.2" />
      {hot && <circle cx="32" cy="8" r="3" fill="#f97316" opacity="0.9" />}
    </g>
  );
}

function Flask({ contents, hot, clipKey }: DrawCtx) {
  const clipId = `${clipKey}-flask`;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d="M28 8 H36 V22 L48 48 Q48 56 32 56 Q16 56 16 48 L28 22 Z" />
        </clipPath>
      </defs>
      <VesselContentStickers clipId={clipId} contents={contents} region={{ x: 16, y: 22, w: 32, h: 34 }} />
      <path
        d="M28 6 H36 V22 L50 50 Q50 58 32 58 Q14 58 14 50 L28 22 Z"
        fill="none"
        stroke="#64748b"
        strokeWidth="2.2"
      />
      {hot && <circle cx="32" cy="4" r="2.5" fill="#f97316" />}
    </g>
  );
}

function Tube({ contents, hot, clipKey }: DrawCtx) {
  const clipId = `${clipKey}-tube`;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d="M26 6 H38 V48 Q38 58 32 58 Q26 58 26 48 Z" />
        </clipPath>
      </defs>
      <VesselContentStickers clipId={clipId} contents={contents} region={{ x: 26, y: 8, w: 12, h: 48 }} />
      <path d="M26 4 H38 V48 Q38 60 32 60 Q26 60 26 48 Z" fill="none" stroke="#64748b" strokeWidth="2" />
      {hot && <path d="M40 20 Q44 16 40 12" stroke="#f97316" fill="none" strokeWidth="1.5" />}
    </g>
  );
}

function Cylinder({ contents, clipKey }: DrawCtx) {
  const clipId = `${clipKey}-cylinder`;
  const ticks = [
    { id: `${clipKey}-tick-y16`, y: 16 },
    { id: `${clipKey}-tick-y24`, y: 24 },
    { id: `${clipKey}-tick-y32`, y: 32 },
    { id: `${clipKey}-tick-y40`, y: 40 },
    { id: `${clipKey}-tick-y48`, y: 48 },
  ];
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x="22" y="8" width="20" height="46" rx="2" />
        </clipPath>
      </defs>
      <VesselContentStickers clipId={clipId} contents={contents} region={{ x: 22, y: 8, w: 20, h: 46 }} />
      <rect x="22" y="8" width="20" height="46" rx="2" fill="none" stroke="#64748b" strokeWidth="2" />
      {ticks.map((t) => (
        <line key={t.id} x1="22" y1={t.y} x2="28" y2={t.y} stroke="#94a3b8" strokeWidth="1" />
      ))}
    </g>
  );
}

function Dish({ contents, clipKey }: DrawCtx) {
  const clipId = `${clipKey}-dish`;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <ellipse cx="32" cy="40" rx="22" ry="10" />
        </clipPath>
      </defs>
      <VesselContentStickers clipId={clipId} contents={contents} region={{ x: 12, y: 32, w: 40, h: 16 }} />
      <ellipse cx="32" cy="36" rx="24" ry="10" fill="none" stroke="#64748b" strokeWidth="2" />
      <path d="M8 36 Q8 48 32 48 Q56 48 56 36" fill="none" stroke="#64748b" strokeWidth="2" />
    </g>
  );
}

function Evap({ contents, clipKey }: DrawCtx) {
  const clipId = `${clipKey}-evap`;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d="M12 28 L52 28 L48 48 Q32 54 16 48 Z" />
        </clipPath>
      </defs>
      <VesselContentStickers clipId={clipId} contents={contents} region={{ x: 14, y: 30, w: 36, h: 20 }} />
      <path d="M12 28 L52 28 L48 48 Q32 54 16 48 Z" fill="none" stroke="#64748b" strokeWidth="2" />
    </g>
  );
}

function Funnel() {
  return (
    <g stroke="#64748b" strokeWidth="2" fill="none">
      <path d="M16 10 H48 L36 32 H28 Z" />
      <path d="M30 32 V54" />
      <path d="M28 54 H36" />
    </g>
  );
}

function RoundFlask({ contents, hot, clipKey }: DrawCtx) {
  const clipId = `${clipKey}-round`;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="40" r="16" />
        </clipPath>
      </defs>
      <VesselContentStickers clipId={clipId} contents={contents} region={{ x: 16, y: 24, w: 32, h: 32 }} />
      <rect x="28" y="6" width="8" height="18" fill="none" stroke="#64748b" strokeWidth="2" />
      <circle cx="32" cy="40" r="16" fill="none" stroke="#64748b" strokeWidth="2" />
      {hot && <circle cx="48" cy="28" r="3" fill="#f97316" />}
    </g>
  );
}
function Dropper() {
  return (
    <g>
      <rect x="28" y="6" width="8" height="14" rx="2" fill="#fca5a5" stroke="#64748b" strokeWidth="1.5" />
      <path d="M30 20 H34 V48 L32 56 L30 48 Z" fill="#e0f2fe" stroke="#64748b" strokeWidth="1.5" />
    </g>
  );
}

function Thermo({ hot }: { hot: boolean }) {
  return (
    <g>
      <rect x="29" y="6" width="6" height="36" rx="2" fill="#fee2e2" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="32" cy="50" r="8" fill={hot ? '#ef4444' : '#f87171'} stroke="#64748b" strokeWidth="1.5" />
      <line x1="32" y1="14" x2="32" y2="44" stroke="#dc2626" strokeWidth="2" />
    </g>
  );
}

function Stir() {
  return <line x1="18" y1="10" x2="46" y2="54" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />;
}

function Tweezers() {
  return (
    <g stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round">
      <path d="M22 8 L28 52" />
      <path d="M42 8 L36 52" />
      <path d="M24 20 H40" />
    </g>
  );
}

function Spatula() {
  return (
    <g stroke="#64748b" strokeWidth="2" fill="none">
      <line x1="20" y1="48" x2="44" y2="12" />
      <ellipse cx="18" cy="52" rx="8" ry="5" fill="#cbd5e1" />
    </g>
  );
}

function Clamp() {
  return (
    <g stroke="#64748b" strokeWidth="2" fill="none">
      <line x1="32" y1="8" x2="32" y2="56" />
      <line x1="20" y1="56" x2="44" y2="56" />
      <path d="M32 24 H48 V36" />
    </g>
  );
}

function Lamp() {
  return (
    <g>
      <ellipse cx="32" cy="48" rx="14" ry="6" fill="#78716c" />
      <path d="M22 48 L22 28 Q22 18 32 18 Q42 18 42 28 L42 48" fill="#fef3c7" stroke="#64748b" strokeWidth="1.5" />
      <path d="M28 16 Q32 6 36 16" fill="#f97316" stroke="#ea580c" strokeWidth="1" />
    </g>
  );
}

function Tripod() {
  return (
    <g stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round">
      <circle cx="32" cy="22" r="10" />
      <line x1="24" y1="28" x2="16" y2="54" />
      <line x1="40" y1="28" x2="48" y2="54" />
      <line x1="32" y1="32" x2="32" y2="54" />
    </g>
  );
}

function Gauze() {
  const hLines = [24, 28, 32, 36, 40].map((y) => ({ id: `gauze-h-y${y}`, y }));
  const vLines = [16, 20.5, 25, 29.5, 34, 38.5, 43, 47.5].map((x) => ({ id: `gauze-v-x${x}`, x }));
  return (
    <g>
      <rect x="12" y="20" width="40" height="24" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      {hLines.map((line) => (
        <line key={line.id} x1="12" y1={line.y} x2="52" y2={line.y} stroke="#94a3b8" strokeWidth="0.8" />
      ))}
      {vLines.map((line) => (
        <line key={line.id} x1={line.x} y1="20" x2={line.x} y2="44" stroke="#94a3b8" strokeWidth="0.8" />
      ))}
    </g>
  );
}

function Battery() {
  return (
    <g>
      <rect x="18" y="18" width="28" height="32" rx="3" fill="#22c55e" stroke="#166534" strokeWidth="1.5" />
      <rect x="26" y="12" width="12" height="8" fill="#a3e635" stroke="#166534" strokeWidth="1" />
      <text x="32" y="38" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
        +
      </text>
    </g>
  );
}

function Bulb({ lit }: { lit: boolean }) {
  return (
    <g>
      <circle cx="32" cy="26" r="14" fill={lit ? '#fde047' : '#e2e8f0'} stroke="#64748b" strokeWidth="1.5" />
      <rect x="26" y="40" width="12" height="12" fill="#94a3b8" />
      {lit && <circle cx="32" cy="26" r="18" fill="#facc15" opacity="0.25" />}
    </g>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <g>
      <rect x="12" y="24" width="40" height="16" rx="4" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      <circle cx={on ? 40 : 24} cy="32" r="6" fill={on ? '#22c55e' : '#94a3b8'} />
    </g>
  );
}

function Wire() {
  return (
    <path
      d="M10 32 Q20 12 32 32 Q44 52 54 32"
      fill="none"
      stroke="#ef4444"
      strokeWidth="3"
      strokeLinecap="round"
    />
  );
}

function Magnet() {
  return (
    <g>
      <path d="M18 16 H30 V48 H18 Q12 48 12 40 V24 Q12 16 18 16 Z" fill="#ef4444" />
      <path d="M34 16 H46 Q52 16 52 24 V40 Q52 48 46 48 H34 V16 Z" fill="#3b82f6" />
    </g>
  );
}

function Ammeter() {
  return (
    <g>
      <circle cx="32" cy="32" r="18" fill="#fff" stroke="#64748b" strokeWidth="2" />
      <text x="32" y="38" textAnchor="middle" fontSize="16" fontWeight="700" fill="#0f172a">
        A
      </text>
    </g>
  );
}

function Lens() {
  return (
    <g>
      <ellipse cx="32" cy="32" rx="10" ry="20" fill="#bae6fd" opacity="0.7" stroke="#0284c7" strokeWidth="2" />
      <line x1="12" y1="32" x2="52" y2="32" stroke="#64748b" strokeWidth="1.5" />
    </g>
  );
}

function Mirror() {
  return (
    <g>
      <rect x="18" y="10" width="28" height="44" rx="2" fill="#e0f2fe" stroke="#64748b" strokeWidth="2" />
      <line x1="22" y1="16" x2="34" y2="28" stroke="#fff" strokeWidth="2" opacity="0.8" />
    </g>
  );
}

function Prism() {
  return (
    <g>
      <path d="M32 10 L52 50 H12 Z" fill="#c4b5fd" opacity="0.7" stroke="#6d28d9" strokeWidth="2" />
      <path d="M14 40 L28 28" stroke="#ef4444" strokeWidth="2" />
      <path d="M28 28 L48 22" stroke="#22c55e" strokeWidth="2" />
      <path d="M28 28 L46 36" stroke="#3b82f6" strokeWidth="2" />
    </g>
  );
}

function Laser() {
  return (
    <g>
      <rect x="14" y="26" width="28" height="12" rx="2" fill="#1e293b" />
      <rect x="42" y="28" width="8" height="8" fill="#64748b" />
      <line x1="50" y1="32" x2="60" y2="32" stroke="#ef4444" strokeWidth="2" />
    </g>
  );
}

function Ruler() {
  const ticks = [14, 18.5, 23, 27.5, 32, 36.5, 41, 45.5, 50].map((x) => ({
    id: `ruler-tick-x${String(x).replace('.', '_')}`,
    x,
    tall: Math.round(x * 2) % 2 === 0,
  }));
  return (
    <g>
      <rect x="10" y="26" width="44" height="12" rx="1" fill="#fef3c7" stroke="#64748b" strokeWidth="1.5" />
      {ticks.map((t) => (
        <line
          key={t.id}
          x1={t.x}
          y1="26"
          x2={t.x}
          y2={t.tall ? 34 : 32}
          stroke="#78716c"
          strokeWidth="1"
        />
      ))}
    </g>
  );
}

function Balance() {
  return (
    <g stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round">
      <line x1="32" y1="12" x2="32" y2="52" />
      <line x1="20" y1="52" x2="44" y2="52" />
      <line x1="14" y1="24" x2="50" y2="24" />
      <path d="M14 24 L10 36 H18 Z" fill="#e2e8f0" />
      <path d="M50 24 L46 36 H54 Z" fill="#e2e8f0" />
    </g>
  );
}

function Stopwatch() {
  return (
    <g>
      <circle cx="32" cy="34" r="16" fill="#fff" stroke="#64748b" strokeWidth="2" />
      <rect x="28" y="10" width="8" height="6" fill="#94a3b8" />
      <line x1="32" y1="34" x2="32" y2="22" stroke="#0f172a" strokeWidth="2" />
      <line x1="32" y1="34" x2="42" y2="34" stroke="#ef4444" strokeWidth="1.5" />
    </g>
  );
}

function ReagentBottle({ symbol, color }: { symbol: string; color: string }) {
  return (
    <g>
      <rect x="26" y="6" width="12" height="8" rx="1" fill="#94a3b8" />
      <path d="M20 16 H44 L42 56 H22 Z" fill={color} stroke="#475569" strokeWidth="1.5" opacity={0.95} />
      <rect x="22" y="22" width="20" height="14" fill="#fff" opacity="0.9" />
      <text
        x="32"
        y="32"
        textAnchor="middle"
        fontSize={symbol.length > 3 ? 7 : 9}
        fontWeight="700"
        fill="#0f172a"
        fontFamily="Segoe UI, Microsoft YaHei, sans-serif"
      >
        {symbol.length > 5 ? symbol.slice(0, 5) : symbol}
      </text>
    </g>
  );
}

function GasBottle({ symbol, color }: { symbol: string; color: string }) {
  return (
    <g>
      <rect x="28" y="4" width="8" height="10" fill="#64748b" />
      <rect x="22" y="14" width="20" height="42" rx="4" fill={color} stroke="#475569" strokeWidth="1.5" />
      <text
        x="32"
        y="40"
        textAnchor="middle"
        fontSize={symbol.length > 3 ? 8 : 10}
        fontWeight="700"
        fill="#0f172a"
        fontFamily="Segoe UI, Microsoft YaHei, sans-serif"
      >
        {symbol}
      </text>
    </g>
  );
}

export function gearAccentColor(kind: string, contents: Array<string | VesselContent> = []): string {
  const kinds = contentKinds(contents);
  if (kinds.length) return defOf(kinds[kinds.length - 1]!).color || '#94a3b8';
  return defOf(kind).color || '#94a3b8';
}