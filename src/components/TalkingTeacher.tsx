import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { subscribeSpeakState, type SpeakState } from '@/lib/read-aloud';

/** 订阅全局朗读状态 */
export function useSpeakState(): SpeakState {
  const [state, setState] = useState<SpeakState>({
    status: 'idle',
    speaking: false,
    paused: false,
    rate: 1,
    hasSession: false,
  });
  useEffect(() => subscribeSpeakState(setState), []);
  return state;
}

/** @deprecated 使用 useSpeakState */
export function useSpeakMouth(): SpeakState {
  return useSpeakState();
}

type FaceProps = {
  src: string;
  emoji?: string;
  name?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  title?: string;
};

/** 可爱拟人老师头像（无嘴部动画） */
export function TalkingTeacherFace({
  src,
  emoji = '👩‍🏫',
  name,
  size = 88,
  className = '',
  onClick,
  title,
}: FaceProps) {
  const { speaking, status } = useSpeakState();
  const active = speaking || status === 'paused';

  return (
    <button
      type="button"
      onClick={onClick}
      title={title || (name ? `点我听${name}说话` : '老师朗读')}
      className={`relative shrink-0 select-none ${onClick ? 'cursor-pointer' : 'cursor-default'} ${className}`}
      style={{ width: size, height: size }}
      aria-label={title || name || '老师'}
    >
      <div
        className={`absolute inset-0 rounded-[26%] overflow-hidden shadow-soft border-[3px] border-white ${
          src.endsWith('.svg') ? 'bg-cyan-50' : 'bg-campus-cream'
        }`}
      >
        <img
          src={src}
          alt={name || '老师'}
          className={`absolute inset-0 h-full w-full ${
            src.endsWith('.svg')
              ? 'object-contain p-[12%]'
              : 'object-cover object-[center_18%]'
          }`}
          draggable={false}
          onError={(e) => {
            const el = e.currentTarget;
            el.style.display = 'none';
            const parent = el.parentElement;
            if (parent && !parent.querySelector('[data-emoji-fallback]')) {
              const span = document.createElement('span');
              span.dataset.emojiFallback = '1';
              span.className = 'absolute inset-0 flex items-center justify-center text-4xl bg-campus-cream';
              span.textContent = emoji;
              parent.appendChild(span);
            }
          }}
        />
      </div>
      <span className="absolute -right-1 -bottom-1 text-[1.05rem] leading-none drop-shadow" aria-hidden>
        {emoji}
      </span>
      {active && (
        <span className="absolute -left-1 -top-1 rounded-full bg-campus-mint text-white p-1 shadow-soft">
          <Volume2 className="w-3 h-3" />
        </span>
      )}
    </button>
  );
}

/** 校长头像（无嘴部动画） */
export function TalkingPrincipalAvatar({
  src,
  size = 96,
  className = '',
  onClick,
}: {
  src: string;
  size?: number;
  className?: string;
  onClick?: () => void;
}) {
  const { speaking, status } = useSpeakState();
  const active = speaking || status === 'paused';

  return (
    <button
      type="button"
      onClick={onClick}
      title="点击校长朗读"
      className={`relative shrink-0 rounded-2xl overflow-hidden border border-white shadow-soft ${className}`}
      style={{ width: size, height: size }}
      aria-label="校长 Agent"
    >
      <img
        src={src}
        alt="校长 Agent"
        className="absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
        onError={(e) => {
          e.currentTarget.src = '/characters/principal-agent.png';
        }}
      />
      {active && (
        <span className="absolute top-1 right-1 rounded-full bg-campus-mint/90 text-white p-1">
          <Volume2 className="w-3 h-3" />
        </span>
      )}
    </button>
  );
}
