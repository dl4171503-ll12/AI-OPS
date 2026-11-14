import { Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { canReadAloud, speakTeacherAloud, type ReadAloudKind } from '@/lib/read-aloud';
import type { SubjectId } from '@/lib/types';
import { useSchoolStore } from '@/store/school';
import { useSpeakState } from '@/components/TalkingTeacher';

/** 一键朗读（Edge TTS）；按年级策略自动显隐 */
export function ReadAloudButton({
  text,
  kind = 'general',
  label = '朗读',
  className = '',
  compact = false,
  subject,
}: {
  text: string;
  kind?: ReadAloudKind;
  label?: string;
  className?: string;
  compact?: boolean;
  subject?: SubjectId | string;
}) {
  const grade = useSchoolStore((s) => s.student?.grade);
  const { status } = useSpeakState();

  if (!canReadAloud(grade, kind)) return null;
  if (!text?.trim()) return null;

  const start = async () => {
    try {
      await speakTeacherAloud(text, grade, subject);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '朗读失败，请稍后重试');
    }
  };

  return (
    <button
      type="button"
      aria-label={label}
      disabled={status === 'loading'}
      onClick={() => void start()}
      className={`inline-flex items-center gap-1 rounded-full border-2 font-bold transition active:scale-[0.98] bg-white border-campus-ink/10 text-campus-ink hover:border-campus-mint hover:bg-campus-mint/10 disabled:opacity-50 ${
        compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
      } ${className}`}
    >
      <Volume2 className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      <span>{status === 'loading' ? '合成中' : label}</span>
    </button>
  );
}

/** 文本块 + 右上角朗读按钮（播放控制在老师头像旁统一展示） */
export function SpeakableBlock({
  text,
  kind = 'general',
  children,
  className = '',
  subject,
}: {
  text: string;
  kind?: ReadAloudKind;
  children?: React.ReactNode;
  className?: string;
  subject?: SubjectId | string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-2 right-2 z-10">
        <ReadAloudButton text={text} kind={kind} subject={subject} compact />
      </div>
      <div className="pr-16">{children}</div>
    </div>
  );
}
