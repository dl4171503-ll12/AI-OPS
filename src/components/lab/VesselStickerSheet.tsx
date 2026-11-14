/**
 * 固定贴图一览：展示不同材料装入烧杯后的样貌（Key id = 材料 kind）
 */
import { useMemo, useState } from 'react';
import { LabGearIcon } from '@/components/lab/LabGearIcon';
import { GEAR_CATALOG, newContentId, type VesselContent } from '@/lib/lab-gear-catalog';
import { stickerOf } from '@/lib/lab-vessel-stickers';

const SAMPLE_KINDS = GEAR_CATALOG.filter((g) => g.material).map((g) => g.id);

export function VesselStickerSheet() {
  const [open, setOpen] = useState(false);
  const samples = useMemo(
    () =>
      SAMPLE_KINDS.map((kind) => {
        const content: VesselContent = { id: `sticker-demo-${kind}`, kind };
        return { id: `sheet-${kind}`, kind, content, sticker: stickerOf(kind) };
      }),
    [],
  );

  return (
    <div className="border-t border-emerald-100 bg-white/90">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-1.5 text-left text-[11px] font-bold text-emerald-800 hover:bg-emerald-50"
      >
        {open ? '▼' : '▶'} 装入贴图一览（固定样貌 · {samples.length} 种）
      </button>
      {open && (
        <div className="max-h-40 overflow-y-auto px-2 pb-2 grid grid-cols-4 sm:grid-cols-6 gap-1.5">
          {samples.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-emerald-100 bg-emerald-50/40 px-1 py-1 text-center"
              title={`${s.sticker.badge} · ${s.sticker.look}`}
              data-sticker-id={s.sticker.id}
            >
              <div className="flex justify-center">
                <LabGearIcon kind="beaker" contents={[s.content]} size={40} />
              </div>
              <div className="text-[9px] font-bold truncate text-campus-ink/70">{s.sticker.badge}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 生成演示用 content（带稳定 Key id） */
export function demoContent(kind: string): VesselContent {
  return { id: newContentId(kind), kind };
}
