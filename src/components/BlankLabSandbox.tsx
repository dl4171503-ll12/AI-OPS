/**
 * 空白实验室：空台面 + 左侧「无尽实验」器材栏，自由拖放探索。
 */
import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { toast } from 'sonner';
import { LabGearIcon } from '@/components/lab/LabGearIcon';
import { VesselStickerSheet } from '@/components/lab/VesselStickerSheet';
import {
  GEAR_CATALOG,
  LAB_CAT_ORDER,
  appendVesselContents,
  canAbsorbIntoVessel,
  contentKinds,
  defOf,
  describeMix,
  formatContentsSummary,
  newContentId,
  type GearKind,
  type VesselContent,
} from '@/lib/lab-gear-catalog';
import { AUTO_ABSORB_DIST } from '@/lib/lab-vessel-stickers';

type PlacedItem = {
  /** 台面实例 Key id，禁止用 index */
  id: string;
  kind: GearKind;
  x: number;
  y: number;
  contents: VesselContent[];
  lit?: boolean;
  hot?: boolean;
};

/** 容器中心与酒精灯的距离 ≤ 此值视为「在灯上加热」 */
const HEAT_DIST = 110;

/** 靠近酒精灯 → hot；移开 → 立刻降温（不残留热状态） */
function withHeatSynced(list: PlacedItem[]): PlacedItem[] {
  const lamps = list.filter((i) => i.kind === 'lamp');
  return list.map((i) => {
    if (!defOf(i.kind).vessel) {
      return i.hot ? { ...i, hot: false } : i;
    }
    const onFlame =
      lamps.length > 0 &&
      lamps.some((lamp) => Math.hypot(i.x - lamp.x, i.y - lamp.y) <= HEAT_DIST);
    if (onFlame === Boolean(i.hot)) return i;
    return { ...i, hot: onFlame };
  });
}

function uid(kind: string) {
  return `placed-${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type Props = {
  onNote?: (s: string) => void;
  onExploreChange?: (count: number) => void;
};

export function BlankLabSandbox({ onNote, onExploreChange }: Props) {
  const benchRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<PlacedItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<string>('全部');
  const [tip, setTip] = useState('台面空空的——从左侧「无尽实验」拿出器材或化学药品开始探索吧！');

  const selected = items.find((i) => i.id === selectedId) || null;

  const visibleGears = useMemo(() => {
    if (catFilter === '全部') return GEAR_CATALOG;
    return GEAR_CATALOG.filter((g) => g.cat === catFilter);
  }, [catFilter]);

  const announce = useCallback(
    (msg: string) => {
      setTip(msg);
      onNote?.(msg);
    },
    [onNote],
  );

  /** 靠近容器 → 自动装入（烧杯：任意非容器物品、无限份；其它容器：仅材料、最多 5 份） */
  const absorbNearVessel = useCallback(
    (itemId: string, list: PlacedItem[]): { next: PlacedItem[]; msg?: string; vesselId?: string } => {
      const src = list.find((i) => i.id === itemId);
      if (!src || defOf(src.kind).vessel) return { next: list };

      const nearest = list
        .filter((i) => i.id !== src.id && defOf(i.kind).vessel)
        .map((i) => ({ i, d: Math.hypot(i.x - src.x, i.y - src.y) }))
        .sort((a, b) => a.d - b.d)[0];

      if (!nearest || nearest.d > AUTO_ABSORB_DIST) return { next: list };
      if (!canAbsorbIntoVessel(nearest.i.kind, src.kind)) return { next: list };

      const poured: VesselContent = { id: newContentId(src.kind), kind: src.kind };
      const vesselBefore = nearest.i;
      const next = list
        .filter((i) => i.id !== src.id)
        .map((i) =>
          i.id === vesselBefore.id
            ? { ...i, contents: appendVesselContents(i.kind, i.contents, poured) }
            : i,
        );
      onExploreChange?.(next.length);
      const vesselLabel = defOf(vesselBefore.kind).label;
      const infiniteHint = vesselBefore.kind === 'beaker' ? ' · 烧杯可无限装入' : '';
      return {
        next,
        vesselId: vesselBefore.id,
        msg: `${describeMix(vesselBefore.contents, src.kind)}（已自动装入「${vesselLabel}」${infiniteHint}）`,
      };
    },
    [onExploreChange],
  );

  const spawn = (kind: GearKind, clientX?: number, clientY?: number) => {
    const bench = benchRef.current;
    let x = 120 + Math.random() * 180;
    let y = 80 + Math.random() * 120;
    if (bench && clientX != null && clientY != null) {
      const r = bench.getBoundingClientRect();
      x = Math.max(24, Math.min(r.width - 64, clientX - r.left - 28));
      y = Math.max(24, Math.min(r.height - 72, clientY - r.top - 28));
    }
    const item: PlacedItem = { id: uid(kind), kind, x, y, contents: [] };
    setItems((prev) => {
      const withItem = [...prev, item];
      if (!defOf(kind).vessel) {
        const absorbed = absorbNearVessel(item.id, withItem);
        if (absorbed.msg) {
          queueMicrotask(() => {
            announce(absorbed.msg!);
            if (absorbed.vesselId) setSelectedId(absorbed.vesselId);
          });
          return withHeatSynced(absorbed.next);
        }
      }
      const synced = withHeatSynced(withItem);
      onExploreChange?.(synced.length);
      queueMicrotask(() => {
        setSelectedId(item.id);
        const justHeated = synced.find((i) => i.id === item.id && i.hot);
        if (justHeated) {
          announce(`「${defOf(kind).label}」已放到酒精灯上，开始变热。`);
        }
      });
      return synced;
    });
    const d = defOf(kind);
    if (kind === 'beaker') {
      announce('拿出了空的「烧杯」。可无限装入任意试剂/器材（拖到附近自动装入）。');
    } else if (d.vessel) {
      announce(`拿出了空的「${d.label}」。把材料拖到它附近会自动装入。`);
    } else if (d.material) {
      announce(`拿出了「${d.label}」。拖到烧杯附近可无限装入；其它容器也会自动吸收材料。`);
    } else {
      announce(
        `拿出了「${d.label}」${d.symbol ? `（${d.symbol}）` : ''}。靠近烧杯可装入。${d.caution ? `注意：${d.caution}` : ''}`,
      );
    }
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setItems((prev) => {
      const next = withHeatSynced(prev.filter((i) => i.id !== selectedId));
      onExploreChange?.(next.length);
      return next;
    });
    setSelectedId(null);
    announce('器材已收回器材柜。');
  };

  const clearBench = () => {
    setItems([]);
    setSelectedId(null);
    onExploreChange?.(0);
    announce('台面已清空，又变成空白实验室啦。');
  };

  const onBenchPointerMove = (e: ReactPointerEvent) => {
    if (!dragId || !benchRef.current) return;
    const r = benchRef.current.getBoundingClientRect();
    const x = Math.max(16, Math.min(r.width - 56, e.clientX - r.left - 28));
    const y = Math.max(16, Math.min(r.height - 72, e.clientY - r.top - 28));
    setItems((prev) =>
      withHeatSynced(prev.map((i) => (i.id === dragId ? { ...i, x, y } : i))),
    );
  };

  const endDrag = () => {
    if (!dragId) {
      setDragId(null);
      return;
    }
    const id = dragId;
    setDragId(null);
    setItems((prev) => {
      const beforeHot = new Map(prev.map((i) => [i.id, Boolean(i.hot)]));
      const { next, msg, vesselId } = absorbNearVessel(id, prev);
      const synced = withHeatSynced(next);
      queueMicrotask(() => {
        if (msg) {
          announce(msg);
          if (vesselId) setSelectedId(vesselId);
        }
        const cooled = synced.filter((i) => beforeHot.get(i.id) && !i.hot);
        const heated = synced.filter((i) => !beforeHot.get(i.id) && i.hot);
        if (cooled.length && !heated.length && !msg) {
          announce(
            cooled.length === 1
              ? `「${defOf(cooled[0]!.kind).label}」已离开酒精灯，温度降下来了。`
              : '容器离开酒精灯后不再保持热状态。',
          );
        } else if (heated.length && !msg) {
          announce(
            heated.length === 1
              ? `「${defOf(heated[0]!.kind).label}」放上酒精灯，开始变热。`
              : '新容器放到酒精灯上，开始变热。',
          );
        }
      });
      return synced;
    });
  };

  const pourIntoNearest = () => {
    if (!selected) return;
    const srcDef = defOf(selected.kind);
    const target = items
      .filter((i) => i.id !== selected.id && defOf(i.kind).vessel)
      .map((i) => ({
        i,
        d: Math.hypot(i.x - selected.x, i.y - selected.y),
      }))
      .sort((a, b) => a.d - b.d)[0];
    if (!target || target.d > 120) {
      toast.message('把物品靠近烧杯/试管等容器再试');
      return;
    }

    let materialKind: GearKind | null = null;
    let consumeSource = false;
    let shiftVesselContents = false;

    if (srcDef.vessel) {
      materialKind = (selected.contents[0]?.kind as GearKind) || null;
      shiftVesselContents = true;
      if (!materialKind) {
        toast.message('容器里没有可倒出的内容');
        return;
      }
      if (!canAbsorbIntoVessel(target.i.kind, materialKind)) {
        toast.message('该容器只能装试剂/材料；请改用烧杯（可装任意物品）');
        return;
      }
    } else if (canAbsorbIntoVessel(target.i.kind, selected.kind)) {
      materialKind = selected.kind;
      consumeSource = !srcDef.material;
    } else {
      toast.message(
        target.i.kind === 'beaker'
          ? '无法装入该物品'
          : '请先选中试剂/材料，或把物品靠近烧杯（烧杯可装任意非容器物品）',
      );
      return;
    }

    const vesselBefore = items.find((i) => i.id === target.i.id)!;
    const poured: VesselContent = { id: newContentId(materialKind), kind: materialKind };
    setItems((prev) =>
      prev
        .filter((i) => !(consumeSource && i.id === selected.id))
        .map((i) => {
          if (i.id === target.i.id) {
            return { ...i, contents: appendVesselContents(i.kind, i.contents, poured) };
          }
          if (i.id === selected.id && shiftVesselContents) {
            return { ...i, contents: i.contents.slice(1) };
          }
          return i;
        }),
    );
    announce(
      `${describeMix(vesselBefore.contents, materialKind)}${
        target.i.kind === 'beaker' ? '（烧杯可无限装入）' : ''
      }`,
    );
  };

  const tryLightCircuit = () => {
    const kinds = new Set(items.map((i) => i.kind));
    const ok = kinds.has('battery') && kinds.has('bulb') && kinds.has('wire') && kinds.has('switch');
    if (!ok) {
      toast.message('试着拿出：干电池 + 导线 + 开关 + 小灯泡');
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.kind === 'bulb' || i.kind === 'switch' ? { ...i, lit: true } : i)),
    );
    announce('电路接通了！小灯泡亮起来～（虚拟示意）');
  };

  const heatNearest = () => {
    const hasLamp = items.some((i) => i.kind === 'lamp');
    if (!hasLamp) {
      toast.message('先拿出酒精灯');
      return;
    }
    setItems((prev) => {
      const synced = withHeatSynced(prev);
      const heated = synced.filter((i) => i.hot);
      queueMicrotask(() => {
        if (!heated.length) {
          toast.message('把烧杯放到酒精灯上方（靠近）才会变热；移开就会变凉');
          return;
        }
        const names = heated.map((i) => defOf(i.kind).label).join('、');
        const mix = heated.flatMap((i) => contentKinds(i.contents));
        if (mix.includes('el_mg') || mix.includes('el_s')) {
          announce(`加热中……${names}里的物质开始剧烈反应（虚拟示意）！移开酒精灯后会降温。`);
        } else {
          announce(`酒精灯正在加热「${names}」。移开后不再保持热状态。`);
        }
      });
      return synced;
    });
  };

  const magnetAttract = () => {
    const mag = selected?.kind === 'magnet' ? selected : items.find((i) => i.kind === 'magnet');
    if (!mag) {
      toast.message('先拿出磁铁');
      return;
    }
    let moved = 0;
    setItems((prev) =>
      prev.map((i) => {
        const d = defOf(i.kind);
        if (!d.magnetic && i.kind !== 'coin') return i;
        // 硬币默认不磁；只吸 magnetic 标记
        if (!d.magnetic) return i;
        const dist = Math.hypot(i.x - mag.x, i.y - mag.y);
        if (dist > 160) return i;
        moved += 1;
        return { ...i, x: mag.x + 36, y: mag.y + moved * 8 };
      }),
    );
    announce(moved ? `磁铁吸住了 ${moved} 件磁性样品（铁/镍/钴等）！` : '附近没有磁性样品，把铁、镍靠近磁铁试试');
  };

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 overflow-hidden">
      <div className="flex flex-col sm:flex-row min-h-[440px]">
        <aside className="sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-emerald-100 bg-white/90 flex flex-col max-h-[300px] sm:max-h-[520px]">
          <div className="px-2.5 py-2 border-b border-emerald-100">
            <div className="text-xs font-black text-emerald-800">🧰 无尽实验</div>
            <p className="text-[10px] text-campus-ink/50 mt-0.5 leading-snug">
              器材与化学药品无限供应 · 共 {GEAR_CATALOG.length} 种
            </p>
          </div>
          <div className="flex gap-1 overflow-x-auto px-2 py-1.5 border-b border-emerald-50">
            <CatChip active={catFilter === '全部'} label="全部" onClick={() => setCatFilter('全部')} />
            {LAB_CAT_ORDER.map((c) => (
              <CatChip key={`cat-${c}`} active={catFilter === c} label={c} onClick={() => setCatFilter(c)} />
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-2 grid grid-cols-3 sm:grid-cols-2 gap-1.5 content-start">
            {visibleGears.map((g) => (
              <button
                key={g.id}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/gear-kind', g.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => spawn(g.kind)}
                className="rounded-xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-100/80 hover:border-emerald-300 px-1 py-1.5 text-center transition active:scale-95"
                title={`${g.label}${g.symbol ? ` (${g.symbol})` : ''} · 无限供应`}
                data-gear-id={g.id}
              >
                <div className="flex justify-center">
                  <LabGearIcon kind={g.kind} size={36} />
                </div>
                <div className="text-[10px] font-bold text-campus-ink/80 mt-0.5 truncate">{g.label}</div>
                {g.symbol ? (
                  <div className="text-[9px] text-emerald-800/70 truncate">{g.symbol}</div>
                ) : (
                  <div className="text-[9px] text-emerald-700/60">∞</div>
                )}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-2 border-b border-emerald-100 bg-white/60">
            <span className="text-[11px] font-bold text-campus-ink/55 mr-1">台面操作</span>
            <ActionBtn onClick={pourIntoNearest} label="倒入附近容器" />
            <span className="text-[10px] text-emerald-700/70 hidden sm:inline">
              烧杯可无限装入任意物品；拖近即自动吸入
            </span>
            <ActionBtn onClick={heatNearest} label="酒精灯加热" />
            <ActionBtn onClick={tryLightCircuit} label="接通电路" />
            <ActionBtn onClick={magnetAttract} label="磁铁吸引" />
            <ActionBtn onClick={removeSelected} label="收回选中" muted />
            <ActionBtn onClick={clearBench} label="清空台面" muted />
          </div>

          <div
            ref={benchRef}
            className="relative flex-1 min-h-[280px] bg-[radial-gradient(circle_at_1px_1px,#d1fae5_1px,transparent_0)] [background-size:18px_18px]"
            onPointerMove={onBenchPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(e) => {
              e.preventDefault();
              const kind = e.dataTransfer.getData('text/gear-kind');
              if (kind && defOf(kind)) spawn(kind, e.clientX, e.clientY);
            }}
            onClick={() => setSelectedId(null)}
          >
            {items.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center px-6">
                  <div className="flex justify-center mb-2 opacity-50">
                    <LabGearIcon kind="beaker" size={56} />
                  </div>
                  <p className="text-sm font-bold text-campus-ink/35">空白实验室</p>
                  <p className="text-xs text-campus-ink/30 mt-1">空烧杯 · 可无限装入任意物品（拖近自动装入）</p>
                </div>
              </div>
            )}

            {items.map((item) => {
              const d = defOf(item.kind);
              const active = item.id === selectedId;
              const filled = item.contents.length > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`absolute w-16 select-none touch-none rounded-xl px-0.5 py-1 text-center transition ${
                    active
                      ? 'bg-white/90 ring-2 ring-emerald-400/80 shadow-sm z-20'
                      : 'bg-transparent border-0 shadow-none z-10 hover:bg-white/40'
                  } ${item.hot ? 'ring-1 ring-orange-400' : ''}`}
                  style={{ left: item.x, top: item.y }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(item.id);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(item.id);
                    setDragId(item.id);
                    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  }}
                >
                  <div className="flex justify-center pointer-events-none">
                    <LabGearIcon
                      kind={item.kind}
                      contents={item.contents}
                      lit={item.lit}
                      hot={item.hot}
                      size={44}
                    />
                  </div>
                  <div className="text-[9px] font-bold truncate text-campus-ink/70 pointer-events-none">
                    {d.label}
                    {d.vessel
                      ? filled
                        ? item.kind === 'beaker'
                          ? `·${item.contents.length}`
                          : '·装'
                        : '·空'
                      : ''}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-3 py-2 border-t border-emerald-100 bg-emerald-50/50 text-[11px] text-emerald-900/90 leading-relaxed">
            <span className="font-bold">现象：</span>
            {tip}
            {selected ? (
              <span className="text-campus-ink/45">
                {' '}
                · 已选中「{defOf(selected.kind).label}」
                {selected.contents.length
                  ? `（内含：${formatContentsSummary(selected.contents)}）`
                  : defOf(selected.kind).vessel
                    ? '（空）'
                    : ''}
              </span>
            ) : null}
            <span className="text-campus-ink/40"> · 台面 {items.length} 件</span>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 border-t border-emerald-100 bg-white/80 text-[10px] text-campus-ink/45 flex flex-wrap gap-x-3 gap-y-0.5">
        {LAB_CAT_ORDER.map((c) => (
          <span key={`footer-cat-${c}`}>
            {c} ×{GEAR_CATALOG.filter((g) => g.cat === c).length}
          </span>
        ))}
        <span className="text-amber-700/80">虚拟实验 · 勿模仿真实危化操作</span>
      </div>
      <VesselStickerSheet />
    </div>
  );
}

function CatChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
        active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-emerald-100 text-campus-ink/60'
      }`}
    >
      {label}
    </button>
  );
}

function ActionBtn({
  onClick,
  label,
  muted,
}: {
  onClick: () => void;
  label: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold border transition ${
        muted
          ? 'bg-white border-campus-ink/10 text-campus-ink/50 hover:bg-slate-50'
          : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500'
      }`}
    >
      {label}
    </button>
  );
}
