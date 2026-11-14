import { ReliableImage } from '@/components/ReliableImage';
import { SCENES, type SceneKey } from '@/lib/scenes';

/**
 * 全视口场景背景：
 * - fixed + inset-0 铺满当前分辨率
 * - object-fit: cover 裁切而非拉伸
 * - 不使用 height:auto 长图滚动拉伸
 */
export function SceneBackdrop({
  scene,
  dim = 0.42,
  children,
  className = '',
}: {
  scene: SceneKey;
  dim?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const src = typeof SCENES[scene] === 'string' ? (SCENES[scene] as string) : '';
  return (
    <div className={`relative min-h-[100dvh] w-full overflow-x-hidden ${className}`}>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <ReliableImage
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center select-none"
          fallbacks={['/scenes/campus-ground.png', '/scenes/campus-scene-named.png']}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(15,23,42,${dim * 0.55}) 0%, rgba(15,23,42,${dim}) 55%, rgba(15,23,42,${Math.min(0.72, dim + 0.18)}) 100%)`,
          }}
        />
      </div>
      <div className="relative z-0">{children}</div>
    </div>
  );
}
