import { CultureSettings } from '@/components/CultureAssessment';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, PrimaryButton, Shell } from '@/components/ui';
import { DECOR_SHOP } from '@/lib/knowledge';
import {
  GRADE_OPTIONS,
  SUBJECTS,
  TEACHER_TONE_OPTIONS,
  type GradeKey,
  type SubjectId,
  type TeacherTone,
} from '@/lib/types';
import { useSchoolStore } from '@/store/school';
import { SCENES } from '@/lib/scenes';
import {
  DEFAULT_STUDY_TIME_PLAN,
  computeSubjectMinutes,
  normalizeStudyTimePlan,
  studyTimeSummaryText,
} from '@/lib/study-time';
import {
  DEFAULT_DAY_SCHEDULE,
  matchSubjectLabel,
  moveScheduleRow,
  normalizeDaySchedule,
  normalizeScheduleRow,
  subjectHallName,
  type DayScheduleRow,
} from '@/lib/day-schedule';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { editionLabel, resolveEdition } from '@/lib/textbook-map';
import { resolveGradeYear } from '@/lib/grade-speak';

function PercentSlider({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <label className="block mt-3">
      <div className="flex justify-between text-xs font-bold mb-1">
        <span>{label}</span>
        <span className="text-campus-mint">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-campus-mint"
      />
      {hint && <p className="text-[11px] text-campus-ink/50 mt-0.5">{hint}</p>}
    </label>
  );
}

export default function ParentCenterPage() {
  const student = useSchoolStore((s) => s.student)!;
  const assessments = useSchoolStore((s) => s.assessments);
  const iqeResult = useSchoolStore((s) => s.iqeResult);
  const editionPrefs = useSchoolStore((s) => s.editionPrefs);
  const plans = useSchoolStore((s) => s.plans);
  const studyTimePlan = useSchoolStore((s) => s.studyTimePlan) || DEFAULT_STUDY_TIME_PLAN;
  const wrongBook = useSchoolStore((s) => s.wrongBook);
  const practices = useSchoolStore((s) => s.practices);
  const emotions = useSchoolStore((s) => s.emotions);
  const inbox = useSchoolStore((s) => s.socialInbox);
  const parent = useSchoolStore((s) => s.parent);
  const setParent = useSchoolStore((s) => s.setParent);
  const setParentPassword = useSchoolStore((s) => s.setParentPassword);
  const adjustStudentProgress = useSchoolStore((s) => s.adjustStudentProgress);
  const setStudyTimePlan = useSchoolStore((s) => s.setStudyTimePlan);
  const setDaySchedule = useSchoolStore((s) => s.setDaySchedule);
  const daySchedule = useSchoolStore((s) => s.daySchedule);
  const unlockDecoration = useSchoolStore((s) => s.unlockDecoration);

  // 仅 passwordSet=true 视为已设密；旧默认 1234 / 空 pin 都算首次，直接进入后强制设密
  const legacyDefault = parent.pin === '1234' && !parent.passwordSet;
  const needsFirstSetup = !parent.passwordSet || legacyDefault || !parent.pin;

  const [gate, setGate] = useState<'enter' | 'setup' | 'ok'>(() =>
    needsFirstSetup ? 'setup' : 'enter',
  );
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [encourage, setEncourage] = useState(parent.encourageMsg || '');

  // 进度调节表单
  const [days, setDays] = useState(student.studyDays);
  const [points, setPoints] = useState(student.points);
  const [grade, setGrade] = useState<GradeKey>(student.grade);
  const [scores, setScores] = useState<Record<string, number>>({
    math: assessments.math?.score ?? 0,
    chinese: assessments.chinese?.score ?? 0,
    english: assessments.english?.score ?? 0,
  });
  const [timeDraft, setTimeDraft] = useState(() => normalizeStudyTimePlan(studyTimePlan));
  const [scheduleDraft, setScheduleDraft] = useState<DayScheduleRow[]>(() =>
    normalizeDaySchedule(daySchedule?.length ? daySchedule : DEFAULT_DAY_SCHEDULE),
  );

  useEffect(() => {
    setDays(student.studyDays);
    setPoints(student.points);
    setGrade(student.grade);
    setScores({
      math: assessments.math?.score ?? 0,
      chinese: assessments.chinese?.score ?? 0,
      english: assessments.english?.score ?? 0,
    });
  }, [student, assessments]);

  useEffect(() => {
    setTimeDraft(normalizeStudyTimePlan(studyTimePlan));
  }, [studyTimePlan]);

  useEffect(() => {
    setScheduleDraft(normalizeDaySchedule(daySchedule?.length ? daySchedule : DEFAULT_DAY_SCHEDULE));
  }, [daySchedule]);

  const timeMinutes = useMemo(() => computeSubjectMinutes(timeDraft), [timeDraft]);
  const minorPercent = 100 - timeDraft.majorPercent;

  const radar = useMemo(
    () =>
      (['math', 'chinese', 'english'] as const).map((id) => ({
        id,
        name: SUBJECTS.find((s) => s.id === id)?.name || id,
        score: assessments[id]?.score ?? 0,
      })),
    [assessments],
  );

  if (gate === 'setup' || (needsFirstSetup && gate !== 'ok')) {
    return (
      <Shell title="家长中心" sceneSrc={SCENES.campus}>
        <Card className="max-w-md mx-auto">
          <h2 className="font-display text-2xl">设置家长密码</h2>
          <p className="text-sm text-campus-ink/65 mt-1">
            首次进入无需验证。请立刻设置自定义密码（至少 4 位），之后进入需验证。
          </p>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mt-4 w-full rounded-xl border px-3 py-2"
            placeholder="设置密码"
          />
          <input
            type="password"
            value={pin2}
            onChange={(e) => setPin2(e.target.value)}
            className="mt-2 w-full rounded-xl border px-3 py-2"
            placeholder="再次确认密码"
          />
          <PrimaryButton
            className="mt-3 w-full"
            onClick={() => {
              if (pin.trim().length < 4) {
                toast.error('密码至少 4 位');
                return;
              }
              if (pin !== pin2) {
                toast.error('两次密码不一致');
                return;
              }
              setParentPassword(pin);
              setGate('ok');
              setPin('');
              setPin2('');
              toast.success('家长密码已设置');
            }}
          >
            保存密码并进入
          </PrimaryButton>
        </Card>
      </Shell>
    );
  }

  if (gate === 'enter') {
    return (
      <Shell title="家长中心" sceneSrc={SCENES.campus}>
        <Card className="max-w-md mx-auto">
          <h2 className="font-display text-2xl">家长验证</h2>
          <p className="text-sm text-campus-ink/65 mt-1">请输入家长密码</p>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mt-4 w-full rounded-xl border px-3 py-2"
            placeholder="家长密码"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && pin === parent.pin) setGate('ok');
            }}
          />
          <PrimaryButton
            className="mt-3 w-full"
            onClick={() => {
              if (needsFirstSetup) {
                setGate('setup');
                return;
              }
              if (pin === parent.pin) setGate('ok');
              else toast.error('密码不正确');
            }}
          >
            进入家长中心
          </PrimaryButton>
        </Card>
      </Shell>
    );
  }

  const socialRisks = inbox.filter((m) => m.blocked || (m.risk && m.risk !== 'none'));

  return (
    <Shell title="家长中心" sceneSrc={SCENES.campus}>
      <div className="grid md:grid-cols-2 gap-3">
        <CultureSettings />
        <Card>
          <div className="font-bold">学情总览</div>
          {radar.map((r) => (
            <div key={r.id} className="mt-2">
              <div className="flex justify-between text-xs">
                <span>{r.name}</span>
                <span>{r.score || '未测'}</span>
              </div>
              <div className="h-2 rounded-full bg-campus-ink/10 overflow-hidden">
                <div className="h-full bg-campus-brick" style={{ width: `${r.score}%` }} />
              </div>
            </div>
          ))}
          <div className="text-xs mt-3 text-campus-ink/65">
            练习 {practices.length} 次 · 错题 {wrongBook.length} · 积分 {student.points} · 学习第 {student.studyDays} 天
          </div>
        </Card>

        <Card>
          <div className="font-bold">多维测评画像</div>
          {iqeResult ? (
            <>
              <p className="mt-2 text-sm">
                人格：<span className="font-bold text-campus-mint">{iqeResult.personality}</span>
                <span className="text-xs text-campus-ink/45 ml-2">
                  {new Date(iqeResult.completedAt).toLocaleDateString()}
                </span>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {Object.entries(iqeResult.iq).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between">
                      <span>{k}</span>
                      <span>{v}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-campus-ink/10 overflow-hidden mt-0.5">
                      <div className="h-full bg-violet-400" style={{ width: `${v}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-campus-ink/65 space-y-1">
                {Object.entries(iqeResult.tendency).map(([k, v]) => (
                  <div key={k}>
                    {k}: <span className="font-bold">{v}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-campus-ink/50">倾向仅作引导参考，不做好坏评判。</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-campus-ink/60">学生尚未完成多维测评。</p>
          )}
          <Link to="/iqe" className="mt-3 inline-block text-sm font-bold text-campus-mint underline">
            {iqeResult ? '重新测评' : '去完成测评'}
          </Link>
          <div className="mt-4 border-t border-campus-ink/10 pt-3 text-xs text-campus-ink/70 space-y-1">
            <div className="font-bold text-campus-ink mb-1">教材版本</div>
            <div>
              语文{' '}
              {editionLabel(
                resolveEdition(editionPrefs, 'chinese', resolveGradeYear(student)),
              )}
            </div>
            <div>
              数学{' '}
              {editionLabel(resolveEdition(editionPrefs, 'math', resolveGradeYear(student)))}
            </div>
            <div>
              英语{' '}
              {editionLabel(
                resolveEdition(editionPrefs, 'english', resolveGradeYear(student)),
              )}
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2 border-2 border-sky-200/80">
          <div className="font-bold text-lg">课程日程表（排序表格）</div>
          <p className="text-xs text-campus-ink/60 mt-1 leading-relaxed">
            填写科目名称后，系统会自动匹配对应教学楼。到点后校长会在首页语音提醒学生前往；若学生停留在错误学科楼，校长也会催促换楼。
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[520px]">
              <thead>
                <tr className="text-left text-xs text-campus-ink/55 border-b">
                  <th className="py-2 pr-2 w-10">序</th>
                  <th className="py-2 pr-2">开始</th>
                  <th className="py-2 pr-2">结束</th>
                  <th className="py-2 pr-2">科目名称</th>
                  <th className="py-2 pr-2">自动匹配</th>
                  <th className="py-2 w-28">排序</th>
                </tr>
              </thead>
              <tbody>
                {scheduleDraft.map((row, idx) => (
                  <tr key={row.id} className="border-b border-campus-ink/5 align-middle">
                    <td className="py-2 pr-2 font-bold text-campus-ink/45">{idx + 1}</td>
                    <td className="py-2 pr-2">
                      <input
                        type="time"
                        value={row.start}
                        onChange={(e) =>
                          setScheduleDraft((list) =>
                            list.map((r) =>
                              r.id === row.id ? normalizeScheduleRow({ ...r, start: e.target.value }) : r,
                            ),
                          )
                        }
                        className="rounded-lg border px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="time"
                        value={row.end}
                        onChange={(e) =>
                          setScheduleDraft((list) =>
                            list.map((r) =>
                              r.id === row.id ? normalizeScheduleRow({ ...r, end: e.target.value }) : r,
                            ),
                          )
                        }
                        className="rounded-lg border px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        value={row.subjectLabel}
                        onChange={(e) => {
                          const label = e.target.value;
                          setScheduleDraft((list) =>
                            list.map((r) =>
                              r.id === row.id
                                ? normalizeScheduleRow({ ...r, subjectLabel: label, subjectId: matchSubjectLabel(label) })
                                : r,
                            ),
                          );
                        }}
                        placeholder="如：数学 / 语文楼"
                        className="w-full rounded-lg border px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      {row.subjectId ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                          {subjectHallName(row.subjectId)}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700">未匹配</span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-lg border p-1.5 hover:bg-campus-cream"
                          title="上移"
                          onClick={() => setScheduleDraft((list) => moveScheduleRow(list, row.id, -1))}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border p-1.5 hover:bg-campus-cream"
                          title="下移"
                          onClick={() => setScheduleDraft((list) => moveScheduleRow(list, row.id, 1))}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border p-1.5 text-red-600 hover:bg-red-50"
                          title="删除"
                          onClick={() => setScheduleDraft((list) => list.filter((r) => r.id !== row.id))}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <PrimaryButton
              onClick={() => {
                setScheduleDraft((list) => [
                  ...list,
                  normalizeScheduleRow({
                    start: '17:00',
                    end: '17:40',
                    subjectLabel: '数学',
                  }),
                ]);
              }}
            >
              <Plus className="w-4 h-4" /> 添加一行
            </PrimaryButton>
            <PrimaryButton
              onClick={() => {
                const next = normalizeDaySchedule(scheduleDraft);
                setScheduleDraft(next);
                setDaySchedule(next);
                toast.success('日程表已保存，将按时间自动提醒学生');
              }}
            >
              保存日程表
            </PrimaryButton>
            <button
              type="button"
              className="rounded-2xl border px-3 py-2 text-sm font-bold"
              onClick={() => {
                setScheduleDraft([...DEFAULT_DAY_SCHEDULE]);
                toast.message('已恢复默认模板（需再点保存）');
              }}
            >
              恢复默认模板
            </button>
          </div>
        </Card>

        <Card className="md:col-span-2 border-2 border-campus-mint/30">
          <div className="font-bold text-lg">每日学习时长占比（主科 / 副科）</div>
          <p className="text-xs text-campus-ink/60 mt-1">
            主科：数学、语文、英语 · 副科：科学、艺术、体育。调整后会影响校长建议与今日任务生成侧重。
          </p>

          <label className="block mt-4 text-xs font-bold">每日总学习时间（分钟）</label>
          <div className="flex items-center gap-3 mt-1">
            <input
              type="range"
              min={30}
              max={300}
              step={10}
              value={timeDraft.dailyMinutes}
              onChange={(e) =>
                setTimeDraft((t) => normalizeStudyTimePlan({ ...t, dailyMinutes: Number(e.target.value) }))
              }
              className="flex-1 accent-campus-mint"
            />
            <input
              type="number"
              min={30}
              max={480}
              value={timeDraft.dailyMinutes}
              onChange={(e) =>
                setTimeDraft((t) => normalizeStudyTimePlan({ ...t, dailyMinutes: Number(e.target.value) || 120 }))
              }
              className="w-20 rounded-xl border px-2 py-1 text-sm"
            />
          </div>

          <PercentSlider
            label={`主科总占比（副科自动为 ${minorPercent}%）`}
            value={timeDraft.majorPercent}
            onChange={(n) => setTimeDraft((t) => normalizeStudyTimePlan({ ...t, majorPercent: n }))}
            hint={`主科约 ${timeMinutes.majorTotal} 分钟 · 副科约 ${timeMinutes.minorTotal} 分钟`}
          />

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-sky-50/80 p-3 border border-sky-100">
              <div className="font-bold text-sm text-sky-800">主科内部占比</div>
              <PercentSlider
                label="数学"
                value={timeDraft.majorSplit.math}
                onChange={(n) =>
                  setTimeDraft((t) =>
                    normalizeStudyTimePlan({ ...t, majorSplit: { ...t.majorSplit, math: n } }),
                  )
                }
                hint={`约 ${timeMinutes.math} 分钟/天`}
              />
              <PercentSlider
                label="语文"
                value={timeDraft.majorSplit.chinese}
                onChange={(n) =>
                  setTimeDraft((t) =>
                    normalizeStudyTimePlan({ ...t, majorSplit: { ...t.majorSplit, chinese: n } }),
                  )
                }
                hint={`约 ${timeMinutes.chinese} 分钟/天`}
              />
              <PercentSlider
                label="英语"
                value={timeDraft.majorSplit.english}
                onChange={(n) =>
                  setTimeDraft((t) =>
                    normalizeStudyTimePlan({ ...t, majorSplit: { ...t.majorSplit, english: n } }),
                  )
                }
                hint={`约 ${timeMinutes.english} 分钟/天`}
              />
            </div>
            <div className="rounded-2xl bg-violet-50/80 p-3 border border-violet-100">
              <div className="font-bold text-sm text-violet-800">副科内部占比</div>
              <PercentSlider
                label="科学"
                value={timeDraft.minorSplit.science}
                onChange={(n) =>
                  setTimeDraft((t) =>
                    normalizeStudyTimePlan({ ...t, minorSplit: { ...t.minorSplit, science: n } }),
                  )
                }
                hint={`约 ${timeMinutes.science} 分钟/天`}
              />
              <PercentSlider
                label="艺术"
                value={timeDraft.minorSplit.art}
                onChange={(n) =>
                  setTimeDraft((t) =>
                    normalizeStudyTimePlan({ ...t, minorSplit: { ...t.minorSplit, art: n } }),
                  )
                }
                hint={`约 ${timeMinutes.art} 分钟/天`}
              />
              <PercentSlider
                label="体育"
                value={timeDraft.minorSplit.pe}
                onChange={(n) =>
                  setTimeDraft((t) =>
                    normalizeStudyTimePlan({ ...t, minorSplit: { ...t.minorSplit, pe: n } }),
                  )
                }
                hint={`约 ${timeMinutes.pe} 分钟/天`}
              />
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-campus-cream/80 px-3 py-2 text-xs text-campus-ink/75">
            {studyTimeSummaryText(timeDraft)}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <PrimaryButton
              onClick={() => {
                const next = normalizeStudyTimePlan(timeDraft);
                setStudyTimePlan(next);
                toast.success('每日主科/副科时长占比已保存');
              }}
            >
              保存时长占比
            </PrimaryButton>
            <button
              type="button"
              className="text-sm px-3 py-2 rounded-2xl border bg-white"
              onClick={() => {
                setTimeDraft({ ...DEFAULT_STUDY_TIME_PLAN });
                toast.message('已恢复默认：主科 70% / 副科 30%');
              }}
            >
              恢复默认
            </button>
          </div>
        </Card>

        <Card>
          <div className="font-bold mb-2">调整学生进度</div>
          <label className="block text-xs mt-2">学习天数</label>
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(Number(e.target.value) || 1)}
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
          <label className="block text-xs mt-2">积分</label>
          <input
            type="number"
            min={0}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value) || 0)}
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
          <label className="block text-xs mt-2">年级阶段</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value as GradeKey)}
            className="w-full rounded-xl border px-3 py-2 text-sm"
          >
            {GRADE_OPTIONS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
          <div className="mt-3 text-xs font-bold">各科测评得分（0-100）</div>
          {(['math', 'chinese', 'english'] as SubjectId[]).map((id) => (
            <label key={id} className="flex items-center gap-2 text-sm mt-1">
              <span className="w-16">{SUBJECTS.find((s) => s.id === id)?.name}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={scores[id] ?? 0}
                onChange={(e) => setScores((prev) => ({ ...prev, [id]: Number(e.target.value) || 0 }))}
                className="flex-1 rounded-xl border px-2 py-1"
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm mt-3">
            <input
              type="checkbox"
              id="mark-tasks"
              onChange={(e) => {
                if (!e.target.checked) return;
                adjustStudentProgress({
                  markTasksDone: { math: true, chinese: true, english: true },
                });
                toast.success('已将三科今日任务标为完成');
              }}
            />
            一键完成三科今日任务（解锁娱乐）
          </label>
          <PrimaryButton
            className="mt-3 w-full"
            onClick={() => {
              adjustStudentProgress({
                studyDays: days,
                points,
                grade,
                assessmentScores: {
                  math: scores.math,
                  chinese: scores.chinese,
                  english: scores.english,
                },
                studyTimePlan: timeDraft,
              });
              setStudyTimePlan(timeDraft);
              toast.success('学生进度与时长占比已更新');
            }}
          >
            保存进度调整
          </PrimaryButton>
          <p className="text-[11px] text-campus-ink/55 mt-2">
            当前方案：数学 {plans.math?.tasks.filter((t) => t.done).length || 0}/{plans.math?.tasks.length || 0} ·
            语文 {plans.chinese?.tasks.filter((t) => t.done).length || 0}/{plans.chinese?.tasks.length || 0} ·
            英语 {plans.english?.tasks.filter((t) => t.done).length || 0}/{plans.english?.tasks.length || 0}
          </p>
        </Card>

        <Card>
          <div className="font-bold">修改家长密码</div>
          <input
            type="password"
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="新密码（至少4位）"
            id="new-parent-pin"
          />
          <PrimaryButton
            className="mt-2"
            onClick={() => {
              const el = document.getElementById('new-parent-pin') as HTMLInputElement | null;
              const v = el?.value || '';
              if (v.trim().length < 4) {
                toast.error('密码至少 4 位');
                return;
              }
              setParentPassword(v);
              if (el) el.value = '';
              toast.success('密码已更新');
            }}
          >
            更新密码
          </PrimaryButton>
        </Card>

        <Card>
          <div className="font-bold">心理状态摘要</div>
          <p className="text-xs text-campus-ink/60 mt-1">不展示完整聊天，仅情绪趋势</p>
          <ul className="mt-2 space-y-2 text-sm">
            {emotions.slice(0, 6).map((e) => (
              <li key={e.id} className="rounded-xl bg-emerald-50 px-3 py-2">
                <span className="font-bold">{e.mood}</span> · {e.summary}
                {e.risk && e.risk !== 'none' ? `（风险:${e.risk}）` : ''}
              </li>
            ))}
            {emotions.length === 0 && <li className="text-sm text-campus-ink/60">暂无谈心记录</li>}
          </ul>
        </Card>

        <Card>
          <div className="font-bold">错题本（只读）</div>
          <ul className="mt-2 space-y-2 max-h-56 overflow-y-auto text-sm">
            {wrongBook.slice(0, 20).map((w) => (
              <li key={w.id} className="border rounded-xl p-2">
                [{w.subject}] {w.question}
              </li>
            ))}
            {wrongBook.length === 0 && <li className="text-campus-ink/60">暂无错题</li>}
          </ul>
        </Card>

        <Card>
          <div className="font-bold">老师语气与朗读情感</div>
          <p className="text-xs text-campus-ink/60 mt-1">
            同时影响老师文字口吻与 Edge TTS 语速/音调。科学楼与体育中心为温和男声；英语楼为外教英文发音。
          </p>
          <div className="mt-3 space-y-2">
            {TEACHER_TONE_OPTIONS.map((opt) => {
              const active = (parent.teacherTone || 'balanced') === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setParent({ teacherTone: opt.id as TeacherTone });
                    toast.success(`老师语气已设为「${opt.label}」`);
                  }}
                  className={`w-full text-left rounded-2xl border px-3 py-3 transition ${
                    active
                      ? 'border-campus-mint bg-campus-mint/10 shadow-sm'
                      : 'border-campus-ink/10 bg-white hover:border-campus-mint/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm">{opt.label}</span>
                    {active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-campus-mint text-white">
                        当前
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-campus-ink/65 mt-1 leading-relaxed">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </Card>



        <Card>
          <div className="font-bold">社交安全面板</div>
          <label className="flex items-center gap-2 text-sm mt-2">
            <input
              type="checkbox"
              checked={parent.allowSocial}
              onChange={(e) => setParent({ allowSocial: e.target.checked })}
            />
            允许校际社交
          </label>
          <label className="block text-sm mt-2">
            低龄聊天可见性
            <select
              className="ml-2 border rounded-lg px-2 py-1"
              value={parent.socialView}
              onChange={(e) => setParent({ socialView: e.target.value as 'full' | 'summary' })}
            >
              <option value="full">全部内容（建议低龄）</option>
              <option value="summary">仅风险摘要</option>
            </select>
          </label>
          <div className="mt-3 text-sm max-h-40 overflow-y-auto space-y-1">
            {(parent.socialView === 'full' ? inbox : socialRisks).slice(0, 15).map((m) => (
              <div key={m.id} className="text-xs rounded-lg bg-campus-cream px-2 py-1">
                {m.blocked ? `拦截：${m.note}` : m.content}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="font-bold">给孩子发鼓励</div>
          <textarea
            value={encourage}
            onChange={(e) => setEncourage(e.target.value)}
            className="mt-2 w-full border rounded-xl px-3 py-2 min-h-[80px]"
            placeholder="今晚继续加油！"
          />
          <PrimaryButton
            className="mt-2"
            onClick={() => {
              setParent({ encourageMsg: encourage });
              toast.success('鼓励消息已送达（学生端设置页可见）');
            }}
          >
            发送鼓励
          </PrimaryButton>
        </Card>

        <Card>
          <div className="font-bold">成长里程碑 / 装饰兑换</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {student.badges.map((b) => (
              <span key={b} className="text-xs bg-campus-sun/40 rounded-full px-2 py-1 font-bold">
                {b}
              </span>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DECOR_SHOP.map((d) => (
              <button
                key={d.id}
                type="button"
                className="rounded-xl border px-2 py-2 text-sm"
                onClick={() => {
                  unlockDecoration(d.id);
                  toast.message(student.points >= 30 ? `尝试兑换 ${d.id}` : '积分不足');
                }}
              >
                {d.emoji} {d.id} · {d.cost}分
              </button>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
