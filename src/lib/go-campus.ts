/** 安全回到校园首页（处理入学拦截与路由偶发失败） */
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { useSchoolStore } from '@/store/school';

export function goCampus(navigate: NavigateFunction, opts?: { requireIntakeDone?: boolean }): boolean {
  const requireIntake = opts?.requireIntakeDone !== false;
  const state = useSchoolStore.getState();
  if (requireIntake && state.student && state.principalIntakeDone === false) {
    toast.message('请先完成与校长的入学面谈，再返回校园');
    navigate('/principal?intake=1', { replace: true });
    return false;
  }
  // 若已有面谈报告但标记丢失，补齐后再走
  if (state.principalIntake && state.principalIntakeDone === false) {
    state.completePrincipalIntake();
  }
  try {
    navigate('/', { replace: true });
  } catch {
    window.location.assign('/');
  }
  return true;
}
