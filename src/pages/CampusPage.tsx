import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, Users } from 'lucide-react';
import { toast } from 'sonner';
import { SUBJECTS, bandLabel } from '@/lib/types';
import { useSchoolStore } from '@/store/school';
import { schoolChat, withAgeBand } from '@/lib/llm';
import { Card, PrimaryButton } from '@/components/ui';

export default function CampusPage() {
  const navigate = useNavigate();
  const student = useSchoolStore((s) => s.student)!;
  const bumpStudyDay = useSchoolStore((s) => s.bumpStudyDay);
  const morningBrief = useSchoolStore((s) => s.morningBrief);
  const setMorningBrief = useSchoolStore((s) => s.setMorningBrief);
  const assessments = useSchoolStore((s) => s.assessments);
  const promotionReady = useSchoolStore((s) => s.promotionReady);
  const showPromotion = useSchoolStore((s) => s.showPromotion);
  const completePromotion = useSchoolStore((s) => s.completePromotion);
  const dismissPromotion = useSchoolStore((s) => s.dismissPromotion);
  const funUnlockedToday = useSchoolStore((s) => s.funUnlockedToday);
  const [hover, setHover] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  useEffect(() => {
    bumpStudyDay();
  }, [bumpStudyDay]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (morningBrief?.date === today) return;
    let cancelled = false;
    (async () => {
      setBriefLoading(true);
      try {
        const content = await schoolChat({
          system: withAgeBand(
            '你是温和有智慧的校长，给学生做简短晨会（80字内）：昨日肯定+今日一目标+一句鼓励。不要列表。',
            student.ageBand,
          ),
          user: `学生${student.name}，年级${student.grade}，学习第${student.studyDays}天。已测评学科：${Object.keys(assessments).join(',') || '暂无'}`,
        });
        if (!cancelled) setMorningBrief(content);
      } catch {
        if (!cancelled) setMorningBrief(`早上好，${student.name}！今天也要勇敢走进教学楼，完成一件小事就很棒。`);
      } finally {
        if (!cancelled) setBriefLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student, assessments, morningBrief, setMorningBrief]);

  const bandClass = student.ageBand === 'low' ? '' : student.ageBand === 'mid' ? 'band-mid' : 'band-high';

  return (
    <div className={`min-h-screen campus-bg ${bandClass}`}>
      <header className="max-w-6xl mx-auto px-4 pt-4 flex items-start justify-between gap-3">
        <div className="rounded-3xl bg-white/85 shadow-soft px-4 py-3 flex items-center gap-3 min-w-0">
          <div className="text-4xl">{student.avatar}</div>
          <div className="min-w-0">
            <div className="font-display text-xl truncate">{student.name} 的学校</div>
            <div className="text-xs text-campus-ink/65">
              {bandLabel(student.ageBand)} · 学习第 {student.studyDays} 天 · 🏫 {student.schoolId}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {student.badges.slice(0, 4).map((b) => (
                <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-campus-sun/40 font-bold">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/parent" className="rounded-2xl bg-white/85 shadow-soft px-3 py-2 text-sm font-bold flex items-center gap-1">
            <Users className="w-4 h-4" /> 家长中心
          </Link>
          <Link to="/settings" className="rounded-2xl bg-white/85 shadow-soft p-2">
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 mt-4">
        <Card className="bg-white/80">
          <div className="flex items-start gap-3">
            <div className="text-4xl">🎩</div>
            <div className="flex-1">
              <div className="font-bold">校长晨会</div>
              <div className="text-sm text-campus-ink/80 mt-1">
                {briefLoading ? '校长正在准备晨会…' : morningBrief?.content || '…'}
              </div>
            </div>
            {promotionReady && (
              <PrimaryButton onClick={() => completePromotion()}>触发晋升仪式</PrimaryButton>
            )}
          </div>
        </Card>
      </section>

      <section className="max-w-6xl mx-auto px-4 mt-6 pb-24">
        <h2 className="font-display text-2xl mb-3 text-campus-ink drop-shadow-sm">我的校园</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {SUBJECTS.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onMouseEnter={() => setHover(b.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => {
                if (!b.enabled) {
                  toast.message(`${b.name} 将在后续版本开放，先去数学/语文/英语楼吧`);
                  return;
                }
                navigate(`/hall/${b.id}`);
              }}
              className="group relative rounded-[1.6rem] p-4 text-left shadow-soft border border-white/60 overflow-hidden transition hover:-translate-y-1"
              style={{
                background: `linear-gradient(160deg, ${b.color}dd, ${b.color}99)`,
                animationDelay: `${i * 0.05}s`,
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.35),transparent_45%)]" />
              <div className="relative">
                <div className="text-4xl md:text-5xl animate-floaty">{b.emoji}</div>
                <div className="mt-3 font-display text-xl text-white drop-shadow">{b.name}</div>
                <div className="text-xs text-white/90 mt-1">{b.blurb}</div>
                {hover === b.id && (
                  <div className="mt-2 text-[11px] bg-black/20 text-white rounded-xl px-2 py-1 inline-block">
                    点击进入 · {b.building}
                  </div>
                )}
                {!b.enabled && <div className="mt-2 text-[11px] text-white/90">预览位</div>}
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { to: '/principal', emoji: '🏛️', name: '校长办公楼', tip: '全局建议' },
            { to: '/counselor', emoji: '💚', name: '心理咨询室', tip: '情绪陪伴' },
            { to: '/fun', emoji: '🎪', name: '娱乐探索楼', tip: funUnlockedToday ? '已解锁' : '完成学习任务后解锁' },
            { to: '/explore', emoji: '🌳', name: '探索广场', tip: '十万个为什么' },
          ].map((x) => (
            <Link
              key={x.to}
              to={x.to}
              className="rounded-3xl bg-white/85 shadow-soft p-4 hover:-translate-y-0.5 transition border border-white/70"
            >
              <div className="text-3xl">{x.emoji}</div>
              <div className="font-bold mt-2">{x.name}</div>
              <div className="text-xs text-campus-ink/60">{x.tip}</div>
            </Link>
          ))}
          <Link
            to="/social"
            className="rounded-3xl bg-white/85 shadow-soft p-4 hover:-translate-y-0.5 transition border border-white/70 md:col-span-2"
          >
            <div className="text-3xl">🤝</div>
            <div className="font-bold mt-2">校际社交广场</div>
            <div className="text-xs text-campus-ink/60">邀请码 {student.inviteCode} · 安全审核已启用</div>
          </Link>
        </div>

        {student.decorations.length > 0 && (
          <Card className="mt-4">
            <div className="font-bold mb-2">校园装饰</div>
            <div className="flex flex-wrap gap-2 text-2xl">
              {student.decorations.map((d) => (
                <span key={d} title={d}>
                  {d === '小树苗' ? '🌱' : d === '花坛' ? '🌸' : d === '喷泉' ? '⛲' : d === '旗杆' ? '🚩' : d === '图书馆角' ? '📚' : '✨'}
                </span>
              ))}
            </div>
          </Card>
        )}
      </section>

      {showPromotion && (
        <div className="fixed inset-0 z-50 bg-campus-ink/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-[2rem] bg-white p-6 text-center shadow-soft overflow-hidden">
            <div className="absolute left-8 top-6 text-3xl fw">🎆</div>
            <div className="absolute right-10 top-10 text-3xl fw" style={{ animationDelay: '0.3s' }}>
              🎇
            </div>
            <div className="text-6xl">🎓</div>
            <h3 className="font-display text-3xl mt-3">晋升仪式</h3>
            <p className="mt-2 text-campus-ink/70">
              全校老师齐聚，校长颁发证书！校园风格已升级到「{bandLabel(student.ageBand)}」。
            </p>
            <PrimaryButton className="mt-5 w-full" onClick={() => dismissPromotion()}>
              收下徽章，继续探索
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
