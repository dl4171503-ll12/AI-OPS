import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Settings, Users, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { bandLabel } from '@/lib/types';
import { useSchoolStore } from '@/store/school';
import { schoolChat, withAgeBand } from '@/lib/llm';
import { Card, PrimaryButton } from '@/components/ui';
import { AvatarView } from '@/components/AvatarPicker';
import { SCENES } from '@/lib/scenes';
import { SUBJECT_HOTSPOTS, CAMPUS_LIFE_CARDS } from '@/lib/campus-hotspots';
import { CampusSceneMap } from '@/components/CampusSceneMap';
import { PRINCIPAL_AGENT_SRC, speakMorningBrief, stopMorningSpeak } from '@/lib/morning-speak';
import { TalkingPrincipalAvatar } from '@/components/TalkingTeacher';
import { ReadAloudControls } from '@/components/ReadAloudControls';
import { pauseReadAloud, resumeReadAloud, getSpeakState } from '@/lib/read-aloud';
import { DEFAULT_STUDY_TIME_PLAN, computeSubjectMinutes } from '@/lib/study-time';
import {
  daypartPromptHint,
  daypartSessionName,
  fallbackBrief,
  getDaypart,
} from '@/lib/daypart';
import {
  currentReminder,
  ensureNotificationPermission,
  showPracticeNotification,
  startPracticeReminderLoop,
} from '@/lib/notifications';
import {
  accessBlockMessage,
  canAccessFunTower,
  canAccessSocial,
  canAccessSubject,
  getAccessSnapshot,
} from '@/lib/access';
import { getStoredPhone } from '@/lib/phone-auth';
import {
  DEFAULT_DAY_SCHEDULE,
  getCurrentScheduleSlot,
  getNextScheduleSlot,
  normalizeDaySchedule,
  subjectHallName,
  subjectHallPath,
} from '@/lib/day-schedule';

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
  const studyTimePlan = useSchoolStore((s) => s.studyTimePlan) || DEFAULT_STUDY_TIME_PLAN;
  const daySchedule = useSchoolStore((s) => s.daySchedule);
  const teacherTone = useSchoolStore((s) => s.parent?.teacherTone || 'balanced');
  const studyMins = computeSubjectMinutes(studyTimePlan);
  const scheduleRows = normalizeDaySchedule(daySchedule?.length ? daySchedule : DEFAULT_DAY_SCHEDULE);
  const nowSlot = getCurrentScheduleSlot(scheduleRows);
  const nextSlot = getNextScheduleSlot(scheduleRows);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [notifyPerm, setNotifyPerm] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );
  /** 同一条寄语只自动朗读一次；结束后可再点「校长朗读」 */
  const autoSpokeKeyRef = useRef<string>('');
  const speakingRef = useRef(false);
  const slot = currentReminder();
  // 校长晨会朗读：audio-1 克隆超真人音色
  const showBriefSpeak = true;
  const daypart = getDaypart();
  const sessionTitle = daypartSessionName(daypart);

  useEffect(() => {
    bumpStudyDay();
  }, [bumpStudyDay]);

  useEffect(() => {
    const stop = startPracticeReminderLoop();
    return () => {
      stop();
      stopMorningSpeak();
    };
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    // 同一天但时段变了（如早→晚）也要重新生成，避免晚上仍是「早上好」
    if (morningBrief?.date === today && morningBrief?.daypart === daypart) return;
    let cancelled = false;
    (async () => {
      setBriefLoading(true);
      try {
        const content = await schoolChat({
          system: withAgeBand(
            `你是AI一人学校的女校长（约45岁），庄重、负责、言简意赅。给学生做简短寄语（80字内）：按时段正式问候+对昨日学习的肯定+今日一个明确目标+一句克制的鼓励。不要列表，不要卖萌。${daypartPromptHint(daypart)}`,
            student.ageBand,
            teacherTone,
            { role: 'principal', student },
          ),
          user: `学生${student.name}，年级${student.gradeYear || student.grade}，学习第${student.studyDays}天。已测评学科：${Object.keys(assessments).join(',') || '暂无'}。当前本地时间请按「${sessionTitle}」来写。`,
          prefer: 'auto',
        });
        if (!cancelled) setMorningBrief(content, daypart);
      } catch {
        if (!cancelled) {
          setMorningBrief(fallbackBrief(student.name, daypart, (student.gradeYear ?? 3) >= 3), daypart);
        }
      } finally {
        if (!cancelled) setBriefLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student, assessments, morningBrief, setMorningBrief, daypart, sessionTitle, teacherTone]);

  const enableNotify = async () => {
    const perm = await ensureNotificationPermission();
    setNotifyPerm(perm);
    if (perm === 'granted') {
      toast.success('已开启练习提醒通知');
      showPracticeNotification();
    } else if (perm === 'denied') {
      toast.error('通知权限被拒绝，可在浏览器设置中开启');
    }
  };

  const playBrief = useCallback(async () => {
    const text = morningBrief?.content || '';
    if (!text) {
      toast.message('晨会内容还在准备中');
      return;
    }
    const st = getSpeakState();
    if (st.status === 'playing') {
      pauseReadAloud();
      speakingRef.current = false;
      setSpeaking(false);
      return;
    }
    if (st.status === 'paused') {
      resumeReadAloud();
      speakingRef.current = true;
      setSpeaking(true);
      return;
    }
    speakingRef.current = true;
    setSpeaking(true);
    try {
      await speakMorningBrief(text, student.grade);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '晨会朗读失败');
    } finally {
      speakingRef.current = false;
      setSpeaking(false);
    }
  }, [morningBrief?.content, student.grade]);

  // 寄语一旦显示在页面上 → 自动朗读；朗读完后仍可再点「校长朗读」
  useEffect(() => {
    if (briefLoading) return;
    const text = morningBrief?.content?.trim();
    if (!text) return;
    const key = `${morningBrief?.date || ''}|${morningBrief?.daypart || daypart}|${text}`;
    if (autoSpokeKeyRef.current === key) return;
    autoSpokeKeyRef.current = key;
    void playBrief();
  }, [briefLoading, morningBrief?.content, morningBrief?.date, morningBrief?.daypart, daypart, playBrief]);

  const enterHotspot = (h: { enabled: boolean; name: string; to: string; subject?: string }) => {
    if (!h.enabled) {
      toast.message(`「${h.name}」将在后续版本开放`);
      return;
    }
    if (h.to.startsWith('/hall/') && h.subject && !canAccessSubject(h.subject)) {
      toast.message(accessBlockMessage(getAccessSnapshot().trialExpired ? 'trial' : 'subject'));
      navigate('/login');
      return;
    }
    if (h.to === '/fun' && !canAccessFunTower()) {
      toast.message(accessBlockMessage('full'));
      navigate('/login');
      return;
    }
    if (h.to === '/social' && !canAccessSocial()) {
      toast.message(accessBlockMessage('full'));
      navigate('/login');
      return;
    }

    navigate(h.to);
  };

  return (
    <div className="min-h-screen bg-[#7ec8e3]">
      <header className="relative z-20 max-w-6xl mx-auto px-4 pt-4 flex items-start justify-between gap-3">
        <div className="rounded-3xl bg-white/90 backdrop-blur-md shadow-soft px-4 py-3 flex items-center gap-3 min-w-0 border border-white/70">
          <AvatarView src={student.avatar} size={56} />
          <div className="min-w-0">
            <div className="font-display text-xl truncate">{student.name} 的学校</div>
            <div className="text-xs text-campus-ink/65">
              {bandLabel(student.ageBand)}
              {student.gradeYear ? ` · ${student.gradeYear}年级` : ''} · 学习第 {student.studyDays} 天 ·{' '}
              {student.schoolId}
            </div>
            {!getStoredPhone() && (
              <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                试用中（语数英）·{' '}
                <Link to="/login" className="underline">
                  登录保留记忆
                </Link>
              </div>
            )}
            {getStoredPhone() && (
              <div className="text-[10px] text-campus-mint font-bold mt-0.5">
                已绑定 {getStoredPhone()!.slice(0, 3)}****{getStoredPhone()!.slice(-4)}
              </div>
            )}
            <div className="text-[10px] text-campus-mint font-bold mt-0.5">
              今日时长 主科{studyTimePlan.majorPercent}%（{studyMins.majorTotal}分）/
              副科{100 - studyTimePlan.majorPercent}%（{studyMins.minorTotal}分）
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {(student.badges || []).slice(0, 4).map((b) => (
                <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-campus-sun/40 font-bold">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={enableNotify}
            className="rounded-2xl bg-white/90 shadow-soft px-3 py-2 text-sm font-bold flex items-center gap-1 border border-white/70"
          >
            <Bell className="w-4 h-4" />
            {notifyPerm === 'granted' ? '提醒已开' : '开启提醒'}
          </button>

          <Link to="/settings" className="rounded-2xl bg-white/90 shadow-soft p-2 border border-white/70">
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <section className="relative z-20 max-w-6xl mx-auto px-4 mt-4 space-y-3">
        <Link to="/assessment" className="block bg-white rounded-2xl p-4 font-bold">入学测评间 · 任务与报告 →</Link>
        <Link to="/ops" className="block rounded-3xl bg-[#163e36] text-white p-5 shadow-soft"><span className="text-xs text-emerald-200">OPS · 学习与创造</span><h2 className="font-bold text-xl mt-1">我的学习路径 · 实战素养课组 →</h2><p className="text-sm text-emerald-100 mt-2">练习、项目会、表达作品与收支账本，在这里连接起来。</p></Link>
        {(nowSlot || nextSlot) && (
          <Card className="bg-white/95 border-campus-mint/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-bold text-sm">今日日程</div>
                {nowSlot ? (
                  <p className="text-sm text-campus-ink/80 mt-1">
                    现在：{nowSlot.start}-{nowSlot.end} · {nowSlot.subjectLabel}
                    {nowSlot.subjectId ? ` → ${subjectHallName(nowSlot.subjectId)}` : '（未匹配教学楼）'}
                  </p>
                ) : (
                  <p className="text-sm text-campus-ink/80 mt-1">
                    下一节：{nextSlot?.start}-{nextSlot?.end} · {nextSlot?.subjectLabel}
                  </p>
                )}
              </div>
              {nowSlot?.subjectId && (
                <PrimaryButton onClick={() => navigate(subjectHallPath(nowSlot.subjectId!))}>
                  去{subjectHallName(nowSlot.subjectId)}
                </PrimaryButton>
              )}
            </div>
          </Card>
        )}
        {slot && (
          <Card className="bg-campus-sun/35 border-campus-sun/40">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-campus-ink shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold">此刻建议：{slot.title}</div>
                <p className="text-sm text-campus-ink/80 mt-1">{slot.body}</p>
              </div>
              <PrimaryButton onClick={() => navigate(`/hall/${slot.subject}`)}>去练习</PrimaryButton>
            </div>
          </Card>
        )}

        <Card className="bg-white/92">
          <div className="flex gap-3 items-start">
            <TalkingPrincipalAvatar
              src={PRINCIPAL_AGENT_SRC}
              size={96}
              className="w-20 h-20 md:w-24 md:h-24"
              onClick={() => void playBrief()}
            />
            <div className="flex-1 min-w-0">
              <div className="font-bold flex items-center gap-2 flex-wrap">
                {sessionTitle}
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-campus-mint/15 text-campus-mint">
                  校长 Agent · audio-1 超真人克隆
                </span>
              </div>
              <div className="text-sm text-campus-ink/80 mt-1">
                {briefLoading ? '校长正在准备寄语…' : morningBrief?.content || '…'}
              </div>
              <div className="flex flex-wrap gap-2 mt-3 items-center">
                {showBriefSpeak && (
                  <PrimaryButton
                    disabled={briefLoading || !morningBrief?.content}
                    onClick={() => void playBrief()}
                  >
                    {speaking ? (
                      <>
                        <VolumeX className="w-4 h-4" /> 暂停
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" /> 校长朗读
                      </>
                    )}
                  </PrimaryButton>
                )}
                {promotionReady && <PrimaryButton onClick={() => completePromotion()}>触发晋升仪式</PrimaryButton>}
              </div>
              <ReadAloudControls className="mt-2" />
            </div>
          </div>
        </Card>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-4 mt-5 pb-24">
        <CampusSceneMap
          src={SCENES.campusNamed}
          hotspots={SUBJECT_HOTSPOTS}
          hoverId={hoverId}
          onHover={setHoverId}
          onEnter={enterHotspot}
        />

        {/* 校园生活：卡片区 */}
        <h2 className="font-display text-2xl mt-8 mb-2 text-campus-ink">校园生活</h2>
        <p className="text-sm text-campus-ink/70 mb-3">体育、校长、咨询、娱乐与广场，点卡片进入</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CAMPUS_LIFE_CARDS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => enterHotspot(c)}
              className="group text-left rounded-[1.5rem] overflow-hidden bg-white/92 border border-white shadow-soft hover:-translate-y-0.5 hover:shadow-lg transition"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-campus-cream">
                <img
                  src={c.image}
                  alt={c.name}
                  className="absolute inset-0 h-full w-full object-cover object-center transition group-hover:scale-[1.03]"
                  draggable={false}
                />
              </div>
              <div className="p-4">
                <div className="font-bold text-campus-ink">{c.name}</div>
                <p className="text-xs text-campus-ink/65 mt-1 leading-relaxed">{c.blurb}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {showPromotion && (
        <div className="fixed inset-0 z-50 bg-campus-ink/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-[2rem] bg-white p-6 text-center shadow-soft overflow-hidden">
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
