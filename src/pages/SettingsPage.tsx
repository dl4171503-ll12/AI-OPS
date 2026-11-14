import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, PrimaryButton, Shell } from '@/components/ui';
import { AvatarPicker } from '@/components/AvatarPicker';
import { useSchoolStore } from '@/store/school';
import { GuardianLinkCard } from '@/components/GuardianConnection';
import { SCENES } from '@/lib/scenes';
import {
  currentReminder,
  ensureNotificationPermission,
  showPracticeNotification,
} from '@/lib/notifications';
import { teacherToneLabel } from '@/lib/types';
import { getStoredPhone, signOutSchool } from '@/lib/phone-auth';

export default function SettingsPage() {
  const navigate = useNavigate();
  const student = useSchoolStore((s) => s.student)!;
  const parent = useSchoolStore((s) => s.parent);
  const resetAll = useSchoolStore((s) => s.resetAll);
  const reloadFromAccountStorage = useSchoolStore((s) => s.reloadFromAccountStorage);
  const updateAvatar = useSchoolStore((s) => s.updateAvatar);
  const completePromotion = useSchoolStore((s) => s.completePromotion);
  const promotionReady = useSchoolStore((s) => s.promotionReady);
  const [perm, setPerm] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );
  const slot = currentReminder();
  const phone = getStoredPhone();

  return (
    <Shell title="设置" sceneSrc={SCENES.campus}><GuardianLinkCard/>
      <Card className="mb-3">
        <div className="font-bold">账号与数据保护</div>
        <p className="text-xs text-campus-ink/60 mt-1 leading-relaxed">
          同一手机号下的学习记忆与交友记录会分开保存。未登录仅能试用一天语数英。
        </p>
        <ul className="text-sm mt-2 space-y-1">
          <li>登录状态：{phone ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '未登录（试用）'}</li>
          <li>年级：{student.gradeYear ? `${student.gradeYear}年级` : student.grade}</li>
        </ul>
        <div className="flex flex-wrap gap-2 mt-3">
          <Link to="/login" className="rounded-2xl px-4 py-2 text-sm font-bold text-white bg-campus-mint">
            {phone ? '切换账号' : '手机号登录'}
          </Link>
          {phone && (
            <PrimaryButton
              onClick={async () => {
                await signOutSchool();
                reloadFromAccountStorage();
                toast.success('已退出登录');
                navigate('/login');
              }}
            >
              退出登录
            </PrimaryButton>
          )}
        </div>
      </Card>

      <Card className="mb-3">
        <div className="font-bold mb-3">更换头像</div>
        <AvatarPicker
          value={student.avatar}
          onChange={(next) => {
            updateAvatar(next);
            toast.success('头像已更新');
          }}
        />
      </Card>

      <Card className="mb-3">
        <div className="font-bold">学校信息</div>
        <ul className="text-sm mt-2 space-y-1">
          <li>学校 ID：{student.schoolId}</li>
          <li>邀请码：{student.inviteCode}</li>
          <li>积分：{student.points}</li>
          <li>学习天数：{student.studyDays}</li>
        </ul>
        {parent.encourageMsg && (
          <div className="mt-3 rounded-2xl bg-campus-sun/30 px-3 py-2 text-sm">家长鼓励：{parent.encourageMsg}</div>
        )}
      </Card>

      <Card className="mb-3">
        <div className="font-bold">老师语气</div>
        <p className="text-sm text-campus-ink/70 mt-1">
          当前：<span className="font-bold text-campus-mint">{teacherToneLabel(parent.teacherTone)}</span>
        </p>
        <p className="text-xs text-campus-ink/55 mt-1">
          一二年级可亲切；三年级起系统会强制正式语气。监护人可在独立家长端调整。
        </p>

      </Card>

      <Card className="mb-3">
        <div className="font-bold">多维入学测评</div>
        <p className="text-sm text-campus-ink/70 mt-1">
          40 项任务、八维任务证据与动态学习计划。
        </p>
        <Link
          to="/iqe"
          className="mt-3 inline-flex rounded-2xl px-4 py-2.5 text-sm font-bold text-white bg-campus-ink"
        >
          开始测评
        </Link>
      </Card>

      <Card className="mb-3 space-y-2">
        <div className="font-bold">练习提醒通知</div>
        <p className="text-sm text-campus-ink/70">
          当前权限：{perm}
          {slot ? ` · 此刻建议「${slot.title}」` : ' · 当前时段暂无固定练习提醒'}
        </p>
        <PrimaryButton
          onClick={async () => {
            const p = await ensureNotificationPermission();
            setPerm(p);
            if (p === 'granted') {
              showPracticeNotification();
              toast.success('已开启通知，并发送一条当前时段提醒');
            } else toast.error('未能获得通知权限');
          }}
        >
          开启 / 测试提醒
        </PrimaryButton>
      </Card>

      {promotionReady && (
        <Card className="mb-3">
          <div className="font-bold">晋升就绪</div>
          <PrimaryButton className="mt-2" onClick={() => completePromotion()}>
            完成晋升
          </PrimaryButton>
        </Card>
      )}

      <Card>
        <div className="font-bold text-red-600">危险操作</div>
        <PrimaryButton
          className="mt-2 !bg-red-500"
          onClick={() => {
            if (window.confirm('确定清空当前账号槽下的学校数据？')) {
              resetAll();
              toast.message('已重置');
              navigate('/onboarding');
            }
          }}
        >
          重置学校数据
        </PrimaryButton>
      </Card>
    </Shell>
  );
}
