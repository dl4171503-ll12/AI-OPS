import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AVATARS, GRADE_OPTIONS, type GradeKey } from '@/lib/types';
import { useSchoolStore } from '@/store/school';
import { PrimaryButton } from '@/components/ui';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const createSchool = useSchoolStore((s) => s.createSchool);
  const existing = useSchoolStore((s) => s.student);
  const [name, setName] = useState(existing?.name || '');
  const [avatar, setAvatar] = useState(existing?.avatar || AVATARS[0]);
  const [grade, setGrade] = useState<GradeKey>(existing?.grade || 'primary-low');
  const [building, setBuilding] = useState(false);

  const gradeMeta = useMemo(() => GRADE_OPTIONS.find((g) => g.key === grade)!, [grade]);

  const start = () => {
    if (!name.trim()) {
      toast.error('请先输入你的名字');
      return;
    }
    setBuilding(true);
    window.setTimeout(() => {
      createSchool({ name, avatar, grade });
      toast.success('学校建造完成！欢迎入学');
      navigate('/');
    }, 1600);
  };

  if (building) {
    return (
      <div className="min-h-screen campus-bg flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-7xl animate-build">🏫</div>
        <h1 className="font-display text-3xl text-campus-ink">正在建造你的专属学校…</h1>
        <p className="text-campus-ink/70">教学楼拔地而起，校长已经在门口等你啦</p>
        <div className="flex gap-3 text-4xl">
          <span className="animate-floaty">🔢</span>
          <span className="animate-floaty" style={{ animationDelay: '0.2s' }}>
            📖
          </span>
          <span className="animate-floaty" style={{ animationDelay: '0.4s' }}>
            🌍
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen campus-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-[2rem] bg-white/92 shadow-soft border border-white/80 p-6 md:p-8">
        <p className="text-sm font-bold text-campus-mint tracking-wide">AI ONE PERSON SCHOOL</p>
        <h1 className="font-display text-4xl mt-2 text-campus-ink">AI一人学校</h1>
        <p className="mt-2 text-campus-ink/70">面向 6–18 岁的游戏化学习校园。先创建属于你的学校吧！</p>

        <label className="block mt-6 text-sm font-bold">你的名字</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：小明"
          className="mt-1 w-full rounded-2xl border border-campus-ink/10 bg-campus-cream px-4 py-3 outline-none focus:ring-2 focus:ring-campus-mint/40"
        />

        <label className="block mt-5 text-sm font-bold">选择头像</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAvatar(a)}
              className={`text-3xl w-14 h-14 rounded-2xl border-2 ${avatar === a ? 'border-campus-mint bg-campus-mint/10' : 'border-transparent bg-campus-cream'}`}
            >
              {a}
            </button>
          ))}
        </div>

        <label className="block mt-5 text-sm font-bold">当前年级</label>
        <div className="mt-2 grid gap-2">
          {GRADE_OPTIONS.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGrade(g.key)}
              className={`text-left rounded-2xl px-4 py-3 border ${grade === g.key ? 'border-campus-mint bg-campus-mint/10' : 'border-campus-ink/10 bg-white'}`}
            >
              <div className="font-bold">{g.label}</div>
              <div className="text-xs text-campus-ink/60">{g.desc}</div>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-campus-ink/60">当前风格：{gradeMeta.desc}</p>

        <PrimaryButton className="w-full mt-6 text-lg py-3" onClick={start}>
          创建我的学校 ✨
        </PrimaryButton>
        {existing && (
          <button type="button" className="w-full mt-3 text-sm text-campus-ink/60 underline" onClick={() => navigate('/')}>
            已有学校，直接进入
          </button>
        )}
      </div>
    </div>
  );
}
