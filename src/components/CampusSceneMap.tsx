import { useCallback, useEffect, useRef, useState } from 'react';
import type { CampusHotspot } from '@/lib/campus-hotspots';

type ContentBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** object-contain 下，图片内容区相对容器的像素矩形 */
function containedBox(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number,
): ContentBox {
  if (containerW <= 0 || containerH <= 0 || naturalW <= 0 || naturalH <= 0) {
    return { left: 0, top: 0, width: containerW, height: containerH };
  }
  const cAspect = containerW / containerH;
  const iAspect = naturalW / naturalH;
  if (cAspect > iAspect) {
    const height = containerH;
    const width = height * iAspect;
    return { left: (containerW - width) / 2, top: 0, width, height };
  }
  const width = containerW;
  const height = width / iAspect;
  return { left: 0, top: (containerH - height) / 2, width, height };
}

type Props = {
  src: string;
  hotspots: CampusHotspot[];
  hoverId: string | null;
  onHover: (id: string | null) => void;
  onEnter: (h: CampusHotspot) => void;
};

/**
 * 校园整图完整显示（不裁剪），热区按「图片内容区」百分比定位，与建筑对齐。
 */
export function CampusSceneMap({ src, hotspots, hoverId, onHover, onEnter }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState<ContentBox>({ left: 0, top: 0, width: 0, height: 0 });
  const aspect = natural.w > 0 && natural.h > 0 ? natural.w / natural.h : 3 / 2;

  const measure = useCallback(() => {
    const el = wrapRef.current;
    if (!el || !natural.w || !natural.h) return;
    const rect = el.getBoundingClientRect();
    setBox(containedBox(rect.width, rect.height, natural.w, natural.h));
  }, [natural.w, natural.h]);

  useEffect(() => {
    measure();
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full mx-auto rounded-[1.75rem] shadow-soft border-4 border-white/80 bg-[#7ec8e3] overflow-hidden"
      style={{
        aspectRatio: `${aspect}`,
        maxHeight: 'min(78vh, 820px)',
        width: `min(100%, calc(min(78vh, 820px) * ${aspect}))`,
      }}
    >
      <img
        src={src}
        alt="我的校园"
        className="absolute inset-0 h-full w-full object-contain object-center select-none pointer-events-none"
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
          }
        }}
        onError={(e) => {
          const img = e.currentTarget;
          if (!img.dataset.fallback) {
            img.dataset.fallback = '1';
            img.src = '/scenes/campus-ground.png';
          }
        }}
      />

      {box.width > 0 &&
        hotspots.map((h, index) => (
          <button
            key={h.id}
            type="button"
            aria-label={h.enabled ? `进入${h.name}` : `${h.name}即将开放`}
            title={h.enabled ? h.name : `${h.name}（即将开放）`}
            onMouseEnter={() => onHover(h.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(h.id)}
            onBlur={() => onHover(null)}
            onClick={() => onEnter(h)}
            className={`absolute border-0 p-0 m-0 appearance-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-xl transition ${
              hoverId === h.id ? 'bg-white/15 ring-2 ring-white/50' : 'bg-transparent'
            } ${!h.enabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            style={{
              left: box.left + (h.x / 100) * box.width,
              top: box.top + (h.y / 100) * box.height,
              width: (h.w / 100) * box.width,
              height: (h.h / 100) * box.height,
              zIndex: 10 + index,
            }}
          >
            {/* 悬停时显示楼名，避免旧贴图文字干扰（如原「体育中心」） */}
            {hoverId === h.id && (
              <span className="pointer-events-none absolute left-1/2 bottom-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-campus-ink shadow-soft border border-white">
                {h.shortName}
              </span>
            )}
          </button>
        ))}
    </div>
  );
}
