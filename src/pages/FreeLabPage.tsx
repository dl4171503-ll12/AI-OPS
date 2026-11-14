/**
 * 科学课后自由实验室（约 30 分钟）：可任选科/物/化/生实验
 * 若由阿科老师任务开门禁：展示观察问题，到期自动关闭并要求回科学楼汇报
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, PrimaryButton, Shell } from '@/components/ui';
import { ScienceLabWorkbench } from '@/components/ScienceLabWorkbench';
import {
  FREE_LAB_MS,
  getLabById,
  labsAll,
  labsForTrack,
  type LabExperiment,
} from '@/lib/science-labs';
import { SCIENCE_TRACKS, type ScienceTrack } from '@/lib/subject-tracks';
import { SCENES } from '@/lib/scenes';
import { useSchoolStore } from '@/store/school';

const LAB_EXPIRED_HINT = '实验时间已经到期了，快去找老师分享本次实验结果吧！';

function remainingMs(until: string | null): number {
  if (!until) return 0;
  return Math.max(0, new Date(until).getTime() - Date.now());
}

function formatRemain(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export default function FreeLabPage() {
  const student = useSchoolStore((s) => s.student);
  const freeLabUntil = useSchoolStore((s) => s.freeLabUntil);
  const unlockFreeLab = useSchoolStore((s) => s.unlockFreeLab);
  const clearFreeLab = useSchoolStore((s) => s.clearFreeLab);
  const markLabCompleted = useSchoolStore((s) => s.markLabCompleted);
  const labCompletedIds = useSchoolStore((s) => s.labCompletedIds) || [];
  const labMission = useSchoolStore((s) => s.labMission);
  const beginLabMissionReflect = useSchoolStore((s) => s.beginLabMissionReflect);

  const [left, setLeft] = useState(() => remainingMs(freeLabUntil));
  const [track, setTrack] = useState<ScienceTrack | 'all'>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  /** 本页会话内是否经历过「权限到期」（用于区分「从未开门」与「时间到」） */
  const [expiredThisVisit, setExpiredThisVisit] = useState(false);

  useEffect(() => {
    const tick = () => {
      const ms = remainingMs(freeLabUntil);
      setLeft(ms);
      if (freeLabUntil && ms <= 0) {
        const wasMission = labMission?.phase === 'open';
        setExpiredThisVisit(true);
        setActiveId(null);
        if (wasMission) {
          beginLabMissionReflect();
          toast.message(LAB_EXPIRED_HINT);
        } else {
          clearFreeLab();
          toast.message(LAB_EXPIRED_HINT);
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [freeLabUntil, clearFreeLab, labMission?.phase, beginLabMissionReflect]);

  const open = left > 0;
  const needReport = labMission?.phase === 'reflect';
  /** 权限已关：整页不可用（到期待汇报，或本页刚到期） */
  const lockedOut = !open && (needReport || expiredThisVisit);
  const band = student?.ageBand;
  const list = useMemo(() => {
    const raw = track === 'all' ? labsAll(band) : labsForTrack(track, band);
    const base = raw.length ? raw : track === 'all' ? labsAll() : labsForTrack(track);
    const blank = base.find((e) => e.id === 'lab-blank-sandbox');
    if (!blank) return base;
    return [blank, ...base.filter((e) => e.id !== 'lab-blank-sandbox')];
  }, [track, band]);

  const active: LabExperiment | undefined = activeId ? getLabById(activeId) : undefined;
  const missionActive = labMission?.phase === 'open' && open;

  if (!student) return <Navigate to="/onboarding" replace />;

  if (lockedOut) {
    return (
      <Shell title="自由实验室 · 已关闭" sceneSrc={SCENES.classroom.science}>
        <Card className="text-center py-10 px-6">
          <div className="text-5xl mb-4" aria-hidden>
            ⏰
          </div>
          <p className="text-lg sm:text-xl font-black text-campus-ink leading-relaxed">
            {LAB_EXPIRED_HINT}
          </p>
          <p className="text-sm text-campus-ink/60 mt-3 leading-relaxed">
            实验室内容已全部锁定，无法继续操作。请先回科学楼向阿科老师汇报发现。
          </p>
          {labMission?.question ? (
            <p className="mt-4 text-left text-xs rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-emerald-950 leading-relaxed">
              <span className="font-bold">本次观察问题：</span>
              {labMission.question}
            </p>
          ) : null}
          <Link
            to="/hall/science"
            className="inline-flex mt-6 rounded-full bg-violet-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-violet-500"
          >
            回科学楼找阿科老师 →
          </Link>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell title="自由实验室 · 阿科老师开放时间" sceneSrc={SCENES.classroom.science}>
      <Card className="mb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-bold text-lg">🔬 课后自由实验室</h2>
            <p className="text-xs text-campus-ink/60 mt-1 leading-relaxed">
              科学课结束后，阿科老师会开放约 30 分钟。也可在辅导里申请临时权限（老师会先给你观察问题）。可进「空白实验室」自由取用器材。
            </p>
          </div>
          {open ? (
            <div className="rounded-2xl bg-violet-600 text-white px-3 py-2 text-center min-w-[88px]">
              <div className="text-[10px] opacity-80">剩余</div>
              <div className="text-xl font-black tabular-nums">{formatRemain(left)}</div>
            </div>
          ) : (
            <PrimaryButton
              className="text-xs"
              onClick={() => {
                toast.message('请先回科学楼找阿科老师申请：老师会先提问，再给你开门禁');
              }}
            >
              找阿科老师开门禁
            </PrimaryButton>
          )}
        </div>
        {!open && (
          <p className="text-[11px] text-amber-800 mt-2 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5">
            当前无实验室权限。在科学楼对阿科老师说「能暂时打开实验室吗」，或点「下课并开放自由实验」。
          </p>
        )}
        {missionActive && labMission && (
          <div className="mt-2 rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-3 py-2.5 text-[12px] text-emerald-950 leading-relaxed">
            <div className="font-black text-emerald-800">阿科老师交给你的观察任务</div>
            <p className="mt-1">{labMission.question}</p>
            <p className="mt-1 text-[11px] text-emerald-800/70">
              焦点：{labMission.focus}
              {labMission.suggestLabTitle ? ` · 建议实验「${labMission.suggestLabTitle}」` : ''}
            </p>
            <p className="mt-1 text-[10px] text-emerald-900/50">时间一到权限自动关闭，请记住现象，回去向老师汇报发现。</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          <Link to="/hall/science" className="text-xs font-bold text-violet-700 underline">
            ← 回科学楼找阿科老师
          </Link>
          {!open && !needReport && (
            <button
              type="button"
              className="text-[10px] text-campus-ink/40 underline"
              onClick={() => {
                setExpiredThisVisit(false);
                unlockFreeLab(FREE_LAB_MS);
                toast.success('已开启 30 分钟练习权限（无观察任务）');
              }}
            >
              练习模式开启 30 分钟
            </button>
          )}
        </div>
      </Card>

      {!open ? (
        <Card className="text-center py-8">
          <p className="text-sm text-campus-ink/70">实验室尚未开放，无法使用实验内容。</p>
          <Link to="/hall/science" className="inline-block mt-3 text-xs font-bold text-violet-700 underline">
            去科学楼申请权限
          </Link>
        </Card>
      ) : (
        <>
          {!active && (
            <button
              type="button"
              onClick={() => setActiveId('lab-blank-sandbox')}
              className="w-full mb-3 text-left rounded-2xl border-2 px-4 py-3.5 transition border-emerald-400 bg-gradient-to-r from-emerald-50 to-sky-50 hover:border-emerald-500 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🥼</span>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-base text-emerald-900">
                    空白实验室
                    <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                      无尽实验
                    </span>
                  </div>
                  <p className="text-xs text-campus-ink/60 mt-0.5 leading-relaxed">
                    台面空空的——左侧有用不完的器材，拖出来自由做实验、自己发现现象
                  </p>
                </div>
                <span className="text-emerald-700 font-bold text-sm shrink-0">进入 →</span>
              </div>
            </button>
          )}

          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2">
            <TrackChip active={track === 'all'} onClick={() => setTrack('all')} label="全部" />
            {SCIENCE_TRACKS.map((t) => (
              <TrackChip
                key={t.id}
                active={track === t.id}
                onClick={() => {
                  setTrack(t.id as ScienceTrack);
                  setActiveId(null);
                }}
                label={t.label}
              />
            ))}
          </div>

          {active ? (
            <div className="space-y-2">
              <button
                type="button"
                className="text-xs font-bold text-violet-700"
                onClick={() => setActiveId(null)}
              >
                ← 返回实验列表
              </button>
              <ScienceLabWorkbench
                experiment={active}
                onComplete={(id) => {
                  markLabCompleted(id);
                  toast.success('已记入实验完成记录（+5 积分）');
                }}
              />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {list
                .filter((exp) => exp.id !== 'lab-blank-sandbox')
                .map((exp) => {
                  const done = labCompletedIds.includes(exp.id);
                  const suggested = missionActive && labMission?.suggestLabId === exp.id;
                  return (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => setActiveId(exp.id)}
                      className={`text-left rounded-2xl border px-3 py-3 transition ${
                        suggested
                          ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300'
                          : 'bg-white hover:border-violet-400 border-violet-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{exp.emoji}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate">
                            {exp.title}
                            {done ? ' ✓' : ''}
                            {suggested ? ' · 老师建议' : ''}
                          </div>
                          <div className="text-[10px] text-campus-ink/50">
                            {SCIENCE_TRACKS.find((t) => t.id === exp.track)?.label} · {exp.topic}
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-campus-ink/60 mt-1 line-clamp-2">{exp.goal}</p>
                    </button>
                  );
                })}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function TrackChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold border ${
        active ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-violet-100'
      }`}
    >
      {label}
    </button>
  );
}
