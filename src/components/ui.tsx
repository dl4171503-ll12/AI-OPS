import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSchoolStore } from '@/store/school';
import { bandLabel } from '@/lib/types';
import { AvatarView } from '@/components/AvatarPicker';
import { ReliableImage } from '@/components/ReliableImage';

/** 全屏背景：cover 居中裁切，不拉伸变形 */
export function SceneBackdrop({
  src,
  overlay = 'rgba(255,248,240,0.55)',
  children,
  className = '',
}: {
  src: string;
  overlay?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative min-h-screen overflow-x-hidden ${className}`}>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-campus-sky overflow-hidden">
        <ReliableImage
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          fallbacks={['/scenes/campus-ground.png', '/scenes/campus-scene-named.png']}
        />
        <div className="absolute inset-0" style={{ background: overlay }} />
      </div>
      {children}
    </div>
  );
}

/** 建筑卡片图：固定 4:3，object-cover，绝不拉伸 */
export function BuildingArt({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative w-full aspect-[4/3] overflow-hidden rounded-2xl bg-white/30">
      <ReliableImage
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover object-center"
        fallbacks={['/scenes/campus-ground.png']}
      />
    </div>
  );
}

/** 教室顶栏英雄图：16:9 响应式 */
export function HeroScene({ src, title, subtitle }: { src: string; title: string; subtitle?: string }) {
  return (
    <div className="relative w-full aspect-[16/9] max-h-[280px] md:max-h-[340px] overflow-hidden rounded-[1.75rem] shadow-soft border border-white/50">
      <ReliableImage
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        fallbacks={['/scenes/classroom-math.png', '/scenes/campus-ground.png']}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-campus-ink/55 via-campus-ink/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 text-white">
        <h2 className="font-display text-2xl md:text-3xl drop-shadow">{title}</h2>
        {subtitle && <p className="text-sm text-white/90 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

/** 二级页统一返回上级（默认回到校园主界面）；也可传入 onClick 做页内返回 */
export function BackButton({
  to = '/',
  label = '返回校园',
  className = '',
  onClick,
}: {
  to?: string;
  label?: string;
  className?: string;
  /**
   * 自定义点击：
   * - 返回 true：继续跳转到 to
   * - 返回 false / void：只执行自定义逻辑（不跳转），兼容兴趣室等页内返回
   */
  onClick?: () => void | boolean;
}) {
  const navigate = useNavigate();
  const go = () => {
    try {
      navigate(to, { replace: to === '/' });
    } catch {
      window.location.assign(to);
    }
  };
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        if (onClick) {
          if (onClick() === true) go();
          return;
        }
        go();
      }}
      className={`inline-flex items-center gap-1.5 rounded-full bg-white text-campus-ink px-3 py-2 text-sm font-bold shadow-soft border-2 border-campus-ink/10 hover:border-campus-mint hover:bg-campus-mint/10 active:scale-[0.98] transition ${className}`}
    >
      <ArrowLeft className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

export function Shell({
  title,
  children,
  backTo = '/',
  backLabel = '返回校园',
  sceneSrc,
  sceneOverlay,
  onBack,
}: {
  title: string;
  children: React.ReactNode;
  backTo?: string;
  backLabel?: string;
  sceneSrc?: string;
  /** 背景遮罩色；默认暖色半透明，AI 教室可传更淡以露出命令行氛围 */
  sceneOverlay?: string;
  /** 返回前钩子；返回 true 才跳转 backTo；返回 false/void 则不跳转 */
  onBack?: () => void | boolean;
}) {
  const student = useSchoolStore((s) => s.student);
  const inner = (
    <>
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/85 border-b border-white/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 min-h-[52px]">
          <BackButton to={backTo} label={backLabel} onClick={onBack} />
          <h1 className="font-display text-lg sm:text-xl md:text-2xl text-campus-ink truncate flex-1">{title}</h1>
          {student && (
            <div className="ml-auto flex items-center gap-2 text-sm text-campus-ink/70 hidden sm:flex shrink-0">
              <AvatarView src={student.avatar} size={28} className="rounded-full" />
              <span className="truncate max-w-[10rem]">
                {student.name} · {bandLabel(student.ageBand)}
              </span>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-5 pb-24">{children}</main>
      {/* 移动端底部固定返回，避免顶栏被挡时无法回去 */}
      <div className="fixed bottom-4 left-4 z-40 sm:hidden">
        <BackButton to={backTo} label={backLabel} onClick={onBack} className="shadow-lg" />
      </div>
    </>
  );

  if (sceneSrc) {
    return (
      <SceneBackdrop src={sceneSrc} overlay={sceneOverlay ?? 'rgba(255,248,240,0.62)'}>
        {inner}
      </SceneBackdrop>
    );
  }

  return <div className="min-h-screen campus-bg">{inner}</div>;
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-white/92 backdrop-blur-sm shadow-soft border border-white/80 p-4 md:p-5 ${className}`}>
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-bold text-white bg-campus-mint hover:brightness-105 disabled:opacity-50 shadow-soft transition ${className}`}
    >
      {children}
    </button>
  );
}

export function MarkdownLite({ text }: { text: string }) {
  return <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-campus-ink">{text}</div>;
}
