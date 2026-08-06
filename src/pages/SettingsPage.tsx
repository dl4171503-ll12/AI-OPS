import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, PrimaryButton, Shell } from '@/components/ui';
import { useSchoolStore } from '@/store/school';

export default function SettingsPage() {
  const student = useSchoolStore((s) => s.student)!;
  const parent = useSchoolStore((s) => s.parent);
  const resetAll = useSchoolStore((s) => s.resetAll);
  const completePromotion = useSchoolStore((s) => s.completePromotion);
  const promotionReady = useSchoolStore((s) => s.promotionReady);

  return (
    <Shell title="设置">
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
      <Card className="mb-3 space-y-2">
        <PrimaryButton disabled={!promotionReady} onClick={() => completePromotion()}>
          {promotionReady ? '举行晋升仪式' : '晋升条件未满足'}
        </PrimaryButton>
        <p className="text-xs text-campus-ink/60">条件：至少 2 科测评≥60、正确练习≥8、学习天数≥2</p>
        <Link className="block text-sm text-campus-mint font-bold" to="/onboarding">
          重新创建学校（不会立刻清除，需点下方重置）
        </Link>
        <PrimaryButton
          className="bg-campus-brick"
          onClick={() => {
            if (confirm('确定清空本地全部数据？')) {
              resetAll();
              toast.success('已重置');
              location.href = '/onboarding';
            }
          }}
        >
          重置本地数据
        </PrimaryButton>
      </Card>
      <Card>
        <div className="font-bold">版本</div>
        <p className="text-sm mt-1">AI一人学校 1.0.0 · DeepSeek/Kimi 密钥已从彩光AI迁移</p>
      </Card>
    </Shell>
  );
}
