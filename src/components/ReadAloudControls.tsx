import { Pause, Play, RotateCcw, Square } from 'lucide-react';
import {
  PLAYBACK_RATES,
  pauseReadAloud,
  replayReadAloud,
  resumeReadAloud,
  setPlaybackRate,
  stopReadAloud,
  type PlaybackRate,
} from '@/lib/read-aloud';
import { useSpeakState } from '@/components/TalkingTeacher';

function rateLabel(r: PlaybackRate) {
  if (r === 0.5) return '0.5x';
  if (r === 1.5) return '1.5x';
  return '1.0x';
}

/** 老师朗读播放条：暂停 / 继续 / 重播 / 倍速 / 停止 */
export function ReadAloudControls({
  className = '',
  alwaysShow = false,
}: {
  className?: string;
  /** 无会话时是否仍显示（用于入口旁常驻） */
  alwaysShow?: boolean;
}) {
  const { status, paused, rate, hasSession, speaking } = useSpeakState();
  const visible = alwaysShow || hasSession || speaking || paused || status === 'loading';
  if (!visible) return null;

  const canPause = status === 'playing';
  const canResume = status === 'paused';
  const canReplay = hasSession && status !== 'loading';

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 rounded-2xl border border-campus-ink/10 bg-white/95 px-2 py-1.5 shadow-sm ${className}`}
    >
      <span className="text-[10px] font-bold text-campus-ink/50 px-1">
        {status === 'loading' ? '合成中…' : status === 'playing' ? '朗读中' : status === 'paused' ? '已暂停' : hasSession ? '可重播' : '朗读'}
      </span>

      {canPause && (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold hover:border-campus-mint"
          onClick={() => pauseReadAloud()}
        >
          <Pause className="w-3.5 h-3.5" /> 暂停
        </button>
      )}

      {canResume && (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold bg-campus-mint/10 border-campus-mint text-campus-mint"
          onClick={() => resumeReadAloud()}
        >
          <Play className="w-3.5 h-3.5" /> 继续
        </button>
      )}

      <button
        type="button"
        disabled={!canReplay}
        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold hover:border-campus-mint disabled:opacity-40"
        onClick={() => void replayReadAloud()}
        title="从头播放"
      >
        <RotateCcw className="w-3.5 h-3.5" /> 重播
      </button>

      <div className="flex items-center gap-0.5 ml-0.5">
        <span className="text-[10px] text-campus-ink/45 font-bold px-1">倍速</span>
        {PLAYBACK_RATES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setPlaybackRate(r)}
            className={`rounded-full px-2 py-1 text-[11px] font-bold border transition ${
              rate === r
                ? 'bg-campus-mint text-white border-campus-mint'
                : 'bg-white border-campus-ink/10 hover:border-campus-mint/50'
            }`}
          >
            {rateLabel(r)}
          </button>
        ))}
      </div>

      {(speaking || paused || status === 'ended') && (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold text-campus-ink/70 hover:border-campus-brick"
          onClick={() => stopReadAloud()}
          title="停止并清空"
        >
          <Square className="w-3 h-3" /> 停止
        </button>
      )}
    </div>
  );
}
