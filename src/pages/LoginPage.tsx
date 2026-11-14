import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PrimaryButton, SceneBackdrop } from '@/components/ui';
import { SCENES } from '@/lib/scenes';
import {
  hydrateAuthFromSession,
  sendPhoneOtp,
  sendEmailOtp,
  verifyPhoneOtp,
  verifyEmailOtp,
  getStoredContact,
  probeAuthBackend,
  signOutSchool,
} from '@/lib/phone-auth';
import { fetchSchoolAccount } from '@/lib/account-db';
import { useSchoolStore } from '@/store/school';
import { yearToGradeKey } from '@/lib/grade-speak';

type Kind = 'phone' | 'email';

export default function LoginPage() {
  const navigate = useNavigate();
  const reloadFromAccountStorage = useSchoolStore((s) => s.reloadFromAccountStorage);
  const createSchool = useSchoolStore((s) => s.createSchool);
  const setIqeResult = useSchoolStore((s) => s.setIqeResult);
  const setEditionPrefs = useSchoolStore((s) => s.setEditionPrefs);
  const student = useSchoolStore((s) => s.student);

  const [kind, setKind] = useState<Kind>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [backendDetail, setBackendDetail] = useState('正在检测后端…');

  const refreshBackend = async (manual = false) => {
    setBackendOk(null);
    setBackendDetail('正在检测后端…');
    const r = await probeAuthBackend();
    setBackendOk(r.ok);
    setBackendDetail(r.detail);
    if (manual) {
      if (r.ok) toast.success('后端服务已连通');
      else toast.error(r.detail);
    }
  };

  const enterAfterAuth = async () => {
    reloadFromAccountStorage();
    let snap = useSchoolStore.getState().student;
    if (!snap) {
      const { row } = await fetchSchoolAccount();
      if (row?.display_name) {
        createSchool({
          name: row.display_name,
          avatar: row.avatar || '',
          gradeYear: row.grade_year || 3,
          grade: yearToGradeKey(row.grade_year || 3),
        });
        if (row.edition_prefs) setEditionPrefs(row.edition_prefs);
        if (row.iqe_result) setIqeResult(row.iqe_result);
        snap = useSchoolStore.getState().student;
      }
    }
    toast.success('登录成功');
    navigate(snap ? '/' : '/onboarding', { replace: true });
  };

  useEffect(() => {
    void refreshBackend(false);
    void hydrateAuthFromSession().then((p) => {
      if (!p) return;
      void enterAfterAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  const onSend = async () => {
    if (!agreed) {
      toast.error('请先同意用户协议与隐私政策');
      return;
    }
    setBusy(true);
    const { error } = kind === 'phone' ? await sendPhoneOtp(phone) : await sendEmailOtp(email);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('验证码已发送');
    setStep('otp');
    setCountdown(60);
  };

  const onVerify = async () => {
    setBusy(true);
    const res =
      kind === 'phone' ? await verifyPhoneOtp(phone, otp) : await verifyEmailOtp(email, otp);
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    await enterAfterAuth();
  };

  const logged = getStoredContact();

  return (
    <SceneBackdrop src={SCENES.campus} overlay="rgba(255,248,240,0.62)">
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[2rem] bg-white/94 shadow-soft border border-white/80 p-6 backdrop-blur-md">
          <p className="text-sm font-bold text-campus-mint tracking-wide">AI ONE PERSON SCHOOL</p>
          <h1 className="font-display text-3xl mt-1">登录已有账号</h1>
          <p className="text-sm text-campus-ink/65 mt-2 leading-relaxed">
            用手机号或邮箱验证码登录。新用户请先去「创建账号」填写资料与头像。
          </p>

          <div
            className={`mt-4 rounded-2xl px-3 py-2 text-xs font-bold flex items-center justify-between gap-2 ${
              backendOk === null
                ? 'bg-campus-cream text-campus-ink/60'
                : backendOk
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-800'
            }`}
          >
            <span>{backendDetail}</span>
            <button type="button" className="underline shrink-0" onClick={() => void refreshBackend(true)}>
              重新检测
            </button>
          </div>

          {logged && (
            <div className="mt-4 rounded-2xl bg-campus-mint/10 px-3 py-2 text-sm">
              当前已登录：
              {logged.kind === 'phone'
                ? `${logged.value.slice(0, 3)}****${logged.value.slice(-4)}`
                : logged.value}
              <Link to={student ? '/' : '/onboarding'} className="ml-2 font-bold text-campus-mint">
                继续
              </Link>
              <button
                type="button"
                className="ml-2 text-xs underline text-campus-ink/50"
                onClick={() => void signOutSchool().then(() => toast.message('已退出'))}
              >
                退出
              </button>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {(['phone', 'email'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setStep('input');
                  setOtp('');
                }}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold border ${
                  kind === k ? 'border-campus-mint bg-campus-mint/10' : 'border-campus-ink/10 bg-white'
                }`}
              >
                {k === 'phone' ? '手机号' : '邮箱'}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {step === 'input' ? (
              <>
                {kind === 'phone' ? (
                  <label className="block text-sm font-bold">
                    手机号
                    <div className="mt-1 flex items-center gap-2 rounded-2xl border bg-campus-cream px-3">
                      <Phone className="w-4 h-4 text-campus-ink/40" />
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        placeholder="11 位手机号"
                        className="flex-1 bg-transparent py-3 outline-none"
                        inputMode="numeric"
                      />
                    </div>
                  </label>
                ) : (
                  <label className="block text-sm font-bold">
                    邮箱
                    <div className="mt-1 flex items-center gap-2 rounded-2xl border bg-campus-cream px-3">
                      <Mail className="w-4 h-4 text-campus-ink/40" />
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="flex-1 bg-transparent py-3 outline-none"
                      />
                    </div>
                  </label>
                )}
                <label className="flex items-start gap-2 text-xs text-campus-ink/60">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  我已阅读并同意用户协议与隐私政策
                </label>
                <PrimaryButton
                  className="w-full"
                  disabled={busy || (kind === 'phone' ? phone.length !== 11 : !email.includes('@'))}
                  onClick={() => void onSend()}
                >
                  {busy ? '发送中…' : '获取验证码'}
                </PrimaryButton>
              </>
            ) : (
              <>
                <p className="text-sm text-campus-ink/70">
                  验证码已发送
                  <button type="button" className="ml-2 text-campus-mint font-bold" onClick={() => setStep('input')}>
                    返回修改
                  </button>
                </p>
                <label className="block text-sm font-bold">
                  验证码
                  <div className="mt-1 flex items-center gap-2 rounded-2xl border bg-campus-cream px-3">
                    <ShieldCheck className="w-4 h-4 text-campus-ink/40" />
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="验证码"
                      className="flex-1 bg-transparent py-3 outline-none"
                      inputMode="numeric"
                    />
                  </div>
                </label>
                <div className="flex gap-2">
                  <PrimaryButton className="flex-1" disabled={busy || otp.length < 4} onClick={() => void onVerify()}>
                    {busy ? '验证中…' : '登录'}
                  </PrimaryButton>
                  <button
                    type="button"
                    disabled={countdown > 0 || busy}
                    className="rounded-2xl border px-3 text-sm font-bold disabled:opacity-50"
                    onClick={() => void onSend()}
                  >
                    {countdown > 0 ? `${countdown}s` : '重发'}
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="mt-5 text-center text-sm text-campus-ink/60">
            还没有账号？{' '}
            <Link to="/onboarding" className="font-bold text-campus-mint underline">
              创建账号（姓名 / 头像）
            </Link>
          </p>
        </div>
      </div>
    </SceneBackdrop>
  );
}
