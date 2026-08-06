import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSchoolStore } from '@/store/school';
import { bandLabel } from '@/lib/types';

export function Shell({
  title,
  children,
  backTo = '/',
}: {
  title: string;
  children: React.ReactNode;
  backTo?: string;
}) {
  const student = useSchoolStore((s) => s.student);
  const band = student?.ageBand || 'low';
  const bandClass = band === 'mid' ? 'band-mid' : band === 'high' ? 'band-high' : '';
  return (
    <div className={`min-h-screen campus-bg ${bandClass}`}>
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/55 border-b border-white/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={backTo} className="p-2 rounded-full bg-white/80 shadow-soft hover:scale-105 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-xl md:text-2xl text-campus-ink">{title}</h1>
          {student && (
            <div className="ml-auto text-sm text-campus-ink/70 hidden sm:block">
              {student.avatar} {student.name} · {bandLabel(student.ageBand)}
            </div>
          )}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-5 pb-16">{children}</main>
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white/90 shadow-soft border border-white/70 p-4 md:p-5 ${className}`}>{children}</div>;
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
  return (
    <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-campus-ink">
      {text}
    </div>
  );
}
