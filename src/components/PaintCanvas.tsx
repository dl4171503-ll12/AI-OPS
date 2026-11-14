import { useCallback, useEffect, useRef, useState } from 'react';

const PRESET_COLORS = [
  '#1a1a1a',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#ffffff',
  '#78350f',
];

const PROMPTS = [
  '画一轮圆月亮',
  '画一棵小树',
  '用三种颜色涂一片天空',
  '画一只简单的小猫脸',
  '画今天的心情色块',
];

/** 频繁一键填充时的文雅短提示 */
const FILL_HINT = '佳作多成于细笔，少用一键。';

const FILL_HINT_EVERY = 3;

type Tool = 'brush' | 'fill' | 'eraser';

type Props = {
  onPaint?: () => void;
  className?: string;
};

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h.padEnd(6, '0').slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function colorMatch(
  data: Uint8ClampedArray,
  i: number,
  r: number,
  g: number,
  b: number,
  a: number,
  tol = 28,
) {
  return (
    Math.abs(data[i]! - r) <= tol &&
    Math.abs(data[i + 1]! - g) <= tol &&
    Math.abs(data[i + 2]! - b) <= tol &&
    Math.abs(data[i + 3]! - a) <= tol
  );
}

/** 基于像素的区域填充（设备像素坐标） */
function floodFill(
  ctx: CanvasRenderingContext2D,
  cssX: number,
  cssY: number,
  dpr: number,
  fillHex: string,
) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  const x0 = Math.floor(cssX * dpr);
  const y0 = Math.floor(cssY * dpr);
  if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return;

  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;
  const start = (y0 * w + x0) * 4;
  const tr = data[start]!;
  const tg = data[start + 1]!;
  const tb = data[start + 2]!;
  const ta = data[start + 3]!;
  const [fr, fg, fb, fa] = hexToRgba(fillHex);

  if (colorMatch(data, start, fr, fg, fb, fa, 8)) return;

  const stack: number[] = [x0, y0];
  const seen = new Uint8Array(w * h);

  while (stack.length) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    let lx = x;
    while (lx >= 0) {
      const idx = y * w + lx;
      if (seen[idx]) break;
      const i = idx * 4;
      if (!colorMatch(data, i, tr, tg, tb, ta)) break;
      lx--;
    }
    lx++;
    let spanUp = false;
    let spanDown = false;
    while (lx < w) {
      const idx = y * w + lx;
      const i = idx * 4;
      if (seen[idx] || !colorMatch(data, i, tr, tg, tb, ta)) break;
      seen[idx] = 1;
      data[i] = fr;
      data[i + 1] = fg;
      data[i + 2] = fb;
      data[i + 3] = fa;

      if (y > 0) {
        const up = (y - 1) * w + lx;
        if (!seen[up] && colorMatch(data, up * 4, tr, tg, tb, ta)) {
          if (!spanUp) {
            stack.push(lx, y - 1);
            spanUp = true;
          }
        } else spanUp = false;
      }
      if (y < h - 1) {
        const down = (y + 1) * w + lx;
        if (!seen[down] && colorMatch(data, down * 4, tr, tg, tb, ta)) {
          if (!spanDown) {
            stack.push(lx, y + 1);
            spanDown = true;
          }
        } else spanDown = false;
      }
      lx++;
    }
  }

  ctx.putImageData(image, 0, 0);
}

export function PaintCanvas({ onPaint, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dprRef = useRef(1);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const colorRef = useRef(PRESET_COLORS[0]!);
  const toolRef = useRef<Tool>('brush');
  const sizeRef = useRef(8);

  const [color, setColor] = useState(PRESET_COLORS[0]!);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [size, setSize] = useState(8);
  const [tool, setTool] = useState<Tool>('brush');
  const [prompt, setPrompt] = useState(PROMPTS[0]!);
  const [fillHint, setFillHint] = useState(false);
  const fillCountRef = useRef(0);
  const hintTimer = useRef<number | null>(null);
  const strokesRef = useRef(0);

  colorRef.current = color;
  toolRef.current = tool;
  sizeRef.current = size;

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;
    const w = parent.clientWidth;
    const h = Math.max(260, Math.min(380, Math.round(w * 0.62)));

    // 尽量保留画面：缩放重绘
    const prev = document.createElement('canvas');
    prev.width = canvas.width;
    prev.height = canvas.height;
    const pctx = prev.getContext('2d');
    if (pctx && canvas.width > 0) pctx.drawImage(canvas, 0, 0);

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#fffef8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (pctx && prev.width > 0) {
      ctx.drawImage(prev, 0, 0, canvas.width, canvas.height);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    };
  }, [resizeCanvas]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = sizeRef.current;
    if (toolRef.current === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = colorRef.current;
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const showFillHintIfNeeded = () => {
    fillCountRef.current += 1;
    if (fillCountRef.current % FILL_HINT_EVERY !== 0) return;
    setFillHint(true);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setFillHint(false), 4200);
  };

  const applyFill = (cssX: number, cssY: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    // floodFill 读写设备像素，需暂时去掉 CSS 缩放变换
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    floodFill(ctx, cssX, cssY, dprRef.current, colorRef.current);
    ctx.restore();
    showFillHintIfNeeded();
    onPaint?.();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = dprRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fffef8';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    strokesRef.current = 0;
  };

  const pickColor = (c: string) => {
    setColor(c);
    setTool((t) => (t === 'eraser' ? 'brush' : t));
  };

  const onCustomColor = (hex: string) => {
    pickColor(hex);
    setCustomColors((prev) => {
      const next = [hex, ...prev.filter((c) => c.toLowerCase() !== hex.toLowerCase())];
      return next.slice(0, 6);
    });
  };

  const nextPrompt = () => {
    setPrompt((p) => {
      const i = PROMPTS.indexOf(p);
      return PROMPTS[(i + 1) % PROMPTS.length]!;
    });
  };

  return (
    <div className={`rounded-3xl border border-campus-mint/25 bg-white/95 p-3 shadow-soft ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-bold text-base text-campus-ink">🎨 动手画一画</div>
          <p className="text-[11px] text-campus-ink/55 mt-0.5">手指或鼠标直接涂鸦 · 不是聊天框</p>
        </div>
        <button
          type="button"
          onClick={nextPrompt}
          className="rounded-full px-3 py-1 text-[11px] font-bold bg-campus-mint/10 text-campus-mint border border-campus-mint/25"
        >
          换个小挑战
        </button>
      </div>

      <div className="rounded-2xl bg-campus-cream/80 px-3 py-2 text-sm text-campus-ink/80 mb-2">
        今日小挑战：<span className="font-bold text-campus-ink">{prompt}</span>
      </div>

      {/* 工具 */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {(
          [
            ['brush', '画笔'],
            ['fill', '一键填充'],
            ['eraser', '橡皮'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTool(id)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold border transition ${
              tool === id
                ? 'bg-campus-mint text-white border-campus-mint'
                : 'bg-white border-campus-ink/15 hover:border-campus-mint/40'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={clear}
          className="rounded-full px-2.5 py-1 text-[11px] font-bold border border-campus-ink/15 bg-white"
        >
          清空
        </button>
      </div>

      {tool === 'fill' && (
        <p className="text-[11px] text-campus-ink/50 mb-2">点选画布中某一区域，即可一键填色。</p>
      )}

      {fillHint && (
        <div
          role="status"
          className="mb-2 rounded-2xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-[12px] text-amber-900/90 tracking-wide"
        >
          {FILL_HINT}
        </div>
      )}

      {/* 颜色：预设 + 自定义 */}
      <div className="mb-2">
        <div className="flex flex-wrap gap-1.5 items-center">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pickColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition ${
                tool !== 'eraser' && color.toLowerCase() === c.toLowerCase()
                  ? 'border-campus-mint scale-110'
                  : 'border-campus-ink/15'
              }`}
              style={{ background: c }}
              aria-label={`颜色 ${c}`}
            />
          ))}
          {customColors.map((c) => (
            <button
              key={`custom-${c}`}
              type="button"
              onClick={() => pickColor(c)}
              className={`w-7 h-7 rounded-full border-2 border-dashed transition ${
                tool !== 'eraser' && color.toLowerCase() === c.toLowerCase()
                  ? 'border-campus-mint scale-110'
                  : 'border-campus-ink/25'
              }`}
              style={{ background: c }}
              aria-label={`自定义色 ${c}`}
              title="自定义色"
            />
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-campus-ink/10 bg-campus-cream/50 px-2.5 py-2">
          <span className="text-[11px] font-bold text-campus-ink/65 shrink-0">自定义颜色</span>
          <label className="relative inline-flex items-center gap-2 cursor-pointer">
            <span
              className="w-8 h-8 rounded-lg border-2 border-campus-mint/40 shadow-sm"
              style={{ background: color }}
            />
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#1a1a1a'}
              onChange={(e) => onCustomColor(e.target.value)}
              className="absolute inset-0 opacity-0 w-8 h-8 cursor-pointer"
              aria-label="打开颜色自定义器"
            />
          </label>
          <input
            type="text"
            value={color}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (/^#[0-9a-fA-F]{3}$/.test(v) || /^#[0-9a-fA-F]{6}$/.test(v)) {
                onCustomColor(v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v);
              } else {
                setColor(v);
              }
            }}
            className="w-[7.5rem] rounded-lg border border-campus-ink/15 px-2 py-1 text-[11px] font-mono"
            placeholder="#RRGGBB"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => {
              if (/^#[0-9a-fA-F]{6}$/i.test(color)) onCustomColor(color);
            }}
            className="rounded-full px-2.5 py-1 text-[10px] font-bold border border-campus-mint/30 text-campus-mint bg-white"
          >
            收入调色板
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-campus-ink/55 shrink-0">粗细</span>
        <input
          type="range"
          min={2}
          max={28}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="flex-1 accent-campus-mint"
          disabled={tool === 'fill'}
        />
        <span className="text-[11px] font-bold text-campus-ink/60 w-6">{size}</span>
      </div>

      <div className="rounded-2xl overflow-hidden border border-campus-ink/10 touch-none">
        <canvas
          ref={canvasRef}
          className={`w-full block bg-[#fffef8] ${tool === 'fill' ? 'cursor-cell' : 'cursor-crosshair'}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const p = pos(e);
            if (toolRef.current === 'fill') {
              applyFill(p.x, p.y);
              return;
            }
            drawing.current = true;
            last.current = p;
            strokesRef.current += 1;
            if (strokesRef.current === 1 || strokesRef.current % 8 === 0) onPaint?.();
          }}
          onPointerMove={(e) => {
            if (!drawing.current || !last.current) return;
            if (toolRef.current === 'fill') return;
            const p = pos(e);
            stroke(last.current, p);
            last.current = p;
          }}
          onPointerUp={() => {
            drawing.current = false;
            last.current = null;
          }}
          onPointerCancel={() => {
            drawing.current = false;
            last.current = null;
          }}
        />
      </div>
    </div>
  );
}
