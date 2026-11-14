import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GRADE_YEAR_OPTIONS, yearToGradeKey } from '@/lib/grade-speak';
import { DEFAULT_AVATAR } from '@/lib/avatars';
import { useSchoolStore } from '@/store/school';
import { PrimaryButton, SceneBackdrop } from '@/components/ui';
import { SCENES } from '@/lib/scenes';
import {
  getStoredContact,
  probeAuthBackend,
  sendEmailOtp,
  sendPhoneOtp,
  verifyEmailOtp,
  verifyPhoneOtp,
} from '@/lib/phone-auth';
import {
  clearAccountDraft,
  loadAccountDraft,
  saveAccountDraft,
  upsertSchoolAccount,
} from '@/lib/account-db';
import { DEFAULT_EDITION_PREFS } from '@/lib/types';

type Step = 'profile' | 'contact' | 'building';
type ContactKind = 'phone' | 'email';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const createSchool = useSchoolStore((s) => s.createSchool);
  const existing = useSchoolStore((s) => s.student);
  const contact = getStoredContact();

  const draft = loadAccountDraft();
  const [step, setStep] = useState<Step>(() => {
    if (existing && contact) return 'profile';
    if (draft && !contact) return 'contact';
    return 'profile';
  });

  const [name, setName] = useState(draft?.displayName || existing?.name || '');
  const avatar = DEFAULT_AVATAR;
  const [gradeYear, setGradeYear] = useState(draft?.gradeYear || existing?.gradeYear || 3);
  const mathVer = DEFAULT_EDITION_PREFS.math;
  const engVer = DEFAULT_EDITION_PREFS.english;

  const [contactKind, setContactKind] = useState<ContactKind>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [backendDetail, setBackendDetail] = useState('检测认证服务…');

  const gradeMeta = useMemo(
    () => GRADE_YEAR_OPTIONS.find((g) => g.year === gradeYear) || GRADE_YEAR_OPTIONS[1],
    [gradeYear],
  );

  useEffect(() => {
    void probeAuthBackend().then((r) => {
      setBackendOk(r.ok);
      setBackendDetail(r.detail);
    });
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  const goContact = () => {
    if (!name.trim()) {
      toast.error('请先输入你的名字');
      return;
    }
    if (!avatar) {
      toast.error('请选择或上传头像');
      return;
    }
    saveAccountDraft({
      displayName: name.trim(),
      avatar,
      gradeYear,
      editionPrefs: { chinese: 'TongBian', math: mathVer, english: engVer },
    });
    const bound = getStoredContact();
    if (bound) {
      void finishCreate(
        bound.kind === 'phone' ? { phone: bound.value } : { email: bound.value },
      );
      return;
    }
    setStep('contact');
  };

  const finishCreate = async (bound: { phone?: string; email?: string }) => {
    const d = loadAccountDraft() || {
      displayName: name.trim(),
      avatar,
      gradeYear,
      editionPrefs: { chinese: 'TongBian', math: mathVer, english: engVer },
    };
    setStep('building');
    createSchool({
      name: d.displayName,
      avatar: d.avatar,
      gradeYear: d.gradeYear,
      grade: yearToGradeKey(d.gradeYear),
    });
    const student = useSchoolStore.getState().student;
    const { error } = await upsertSchoolAccount({
      displayName: d.displayName,
      avatar: d.avatar,
      gradeYear: d.gradeYear,
      phone: bound.phone || null,
      email: bound.email || null,
      editionPrefs: d.editionPrefs,
      schoolId: student?.schoolId || null,
      profileJson: { source: 'onboarding', createdAt: new Date().toISOString() },
    });
    clearAccountDraft();
    if (error) {
      toast.error(`账号已本地创建，但写入数据库失败：${error.message}`);
    } else {
      toast.success('账号创建完成，接下来完成入学测评');
    }
    window.setTimeout(() => {
      navigate('/assessment', { replace: true });
    }, 1200);
  };

  const onSendOtp = async () => {
    setBusy(true);
    const res =
      contactKind === 'phone' ? await sendPhoneOtp(phone) : await sendEmailOtp(email);
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(contactKind === 'phone' ? '验证码已发送到手机' : '验证码已发送到邮箱');
    setOtpSent(true);
    setCountdown(60);
  };

  const onVerify = async () => {
    setBusy(true);
    if (contactKind === 'phone') {
      const { error, phone: ok } = await verifyPhoneOtp(phone, otp);
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      await finishCreate({ phone: ok || phone.replace(/\D/g, '') });
    } else {
      const { error, email: ok } = await verifyEmailOtp(email, otp);
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      await finishCreate({ email: ok || email.trim().toLowerCase() });
    }
  };

  if (step === 'building') {
    return (
      <SceneBackdrop src={SCENES.campus} overlay="rgba(255,248,240,0.55)">
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="w-full max-w-lg aspect-[16/9] overflow-hidden rounded-[2rem] shadow-soft border border-white/60">
            <img src={SCENES.campus} alt="" className="h-full w-full object-cover object-center animate-build" />
          </div>
          <h1 className="font-display text-3xl text-campus-ink">正在创建账号并建造学校…</h1>
          <p className="text-campus-ink/70">档案写入数据库后，将前往校长办公室报到</p>
        </div>
      </SceneBackdrop>
    );
  }

  if (step === 'contact') {
    return (
      <SceneBackdrop src={SCENES.campus} overlay="rgba(255,248,240,0.58)">
        <div className="min-h-screen flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md rounded-[2rem] bg-white/94 shadow-soft border border-white/80 p-6 backdrop-blur-md">
            <p className="text-xs font-bold text-campus-mint">步骤 2 / 2</p>
            <h1 className="font-display text-3xl mt-1">绑定手机或邮箱</h1>
            <p className="text-sm text-campus-ink/65 mt-2">
              你好，{name.trim() || '同学'}。验证通过后，账号会写入云端数据库，换设备也能找回。
            </p>

            <div
              className={`mt-4 rounded-2xl px-3 py-2 text-xs font-bold ${
                backendOk ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
              }`}
            >
              {backendDetail}
            </div>

            <div className="mt-4 flex gap-2">
              {(['phone', 'email'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setContactKind(k);
                    setOtpSent(false);
                    setOtp('');
                  }}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold border ${
                    contactKind === k
                      ? 'border-campus-mint bg-campus-mint/10'
                      : 'border-campus-ink/10 bg-white'
                  }`}
                >
                  {k === 'phone' ? '手机号' : '邮箱'}
                </button>
              ))}
            </div>

            {contactKind === 'phone' ? (
              <label className="block mt-4 text-sm font-bold">
                手机号
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="11 位手机号"
                  className="mt-1 w-full rounded-2xl border border-campus-ink/10 bg-campus-cream px-4 py-3"
                />
              </label>
            ) : (
              <label className="block mt-4 text-sm font-bold">
                邮箱
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-1 w-full rounded-2xl border border-campus-ink/10 bg-campus-cream px-4 py-3"
                />
              </label>
            )}

            {otpSent && (
              <label className="block mt-3 text-sm font-bold">
                验证码
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="填写收到的验证码"
                  className="mt-1 w-full rounded-2xl border border-campus-ink/10 bg-campus-cream px-4 py-3"
                />
              </label>
            )}

            <div className="mt-5 space-y-2">
              {!otpSent ? (
                <PrimaryButton className="w-full" disabled={busy} onClick={() => void onSendOtp()}>
                  {busy ? '发送中…' : '发送验证码'}
                </PrimaryButton>
              ) : (
                <>
                  <PrimaryButton className="w-full" disabled={busy} onClick={() => void onVerify()}>
                    {busy ? '验证中…' : '验证并创建账号'}
                  </PrimaryButton>
                  <button
                    type="button"
                    disabled={countdown > 0 || busy}
                    className="w-full text-sm text-campus-ink/60 underline disabled:opacity-40"
                    onClick={() => void onSendOtp()}
                  >
                    {countdown > 0 ? `${countdown}s 后可重发` : '重新发送验证码'}
                  </button>
                </>
              )}
              <button
                type="button"
                className="w-full text-sm text-campus-ink/55 underline"
                onClick={() => setStep('profile')}
              >
                返回修改资料
              </button>
            </div>
          </div>
        </div>
      </SceneBackdrop>
    );
  }

  return (
    <SceneBackdrop src={SCENES.campus} overlay="rgba(255,248,240,0.58)">
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-[2rem] bg-white/92 shadow-soft border border-white/80 p-6 md:p-8 backdrop-blur-md">
          <p className="text-xs font-bold text-campus-mint">步骤 1 / 2 · 创建账号</p>
          <h1 className="font-display text-4xl mt-1 text-campus-ink">先填写你的信息</h1>
          <p className="mt-2 text-campus-ink/70">
            先填写姓名与年级，再验证手机或邮箱进入测评。头像、教材和学校个性化配置在测评完成后设置。
          </p>

          <label className="block mt-6 text-sm font-bold">你的名字</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：小明"
            className="mt-1 w-full rounded-2xl border border-campus-ink/10 bg-campus-cream px-4 py-3 outline-none focus:ring-2 focus:ring-campus-mint/40"
          />

          <label className="block mt-5 text-sm font-bold">当前年级</label>
          <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
            {GRADE_YEAR_OPTIONS.map((g) => (
              <button
                key={g.year}
                type="button"
                onClick={() => setGradeYear(g.year)}
                className={`rounded-2xl px-2 py-2.5 border text-sm font-bold ${
                  gradeYear === g.year
                    ? 'border-campus-mint bg-campus-mint/10'
                    : 'border-campus-ink/10 bg-white'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-campus-ink/60">已选：{gradeMeta.label}</p>

          <PrimaryButton className="w-full mt-6 text-lg py-3" onClick={goContact}>
            下一步：绑定手机 / 邮箱
          </PrimaryButton>
          <p className="mt-3 text-center text-sm text-campus-ink/55">
            已有账号？{' '}
            <Link to="/login" className="font-bold text-campus-mint underline">
              去登录
            </Link>
          </p>
        </div>
      </div>
    </SceneBackdrop>
  );
}
