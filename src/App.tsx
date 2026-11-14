import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useSchoolStore } from '@/store/school';
import { getStoredContact, hydrateAuthFromSession } from '@/lib/phone-auth';
import { fetchSchoolAccount } from '@/lib/account-db';
import { yearToGradeKey } from '@/lib/grade-speak';
import {canAccessSubject,canAccessSocial,canAccessFunTower} from '@/lib/access';
import { studentStage } from '@/lib/admission-stage';
import { GuardianPolicyRefresh } from '@/components/GuardianConnection';
const CampusRuntime=lazy(()=>import('@/components/CampusRuntime'));
const AssessmentRoomPage=lazy(()=>import('@/pages/AssessmentRoomPage'));
const EnglishExamPage=lazy(()=>import('@/pages/EnglishExamPage'));
const SchoolSetupPage=lazy(()=>import('@/pages/SchoolSetupPage'));
const OnboardingPage=lazy(()=>import('@/pages/OnboardingPage'));
const LoginPage=lazy(()=>import('@/pages/LoginPage'));
const CampusPage=lazy(()=>import('@/pages/CampusPage'));
const SubjectHallPage=lazy(()=>import('@/pages/SubjectHallPage'));
const FreeLabPage=lazy(()=>import('@/pages/FreeLabPage'));
const PrincipalPage=lazy(()=>import('@/pages/PrincipalPage'));
const CounselorPage=lazy(()=>import('@/pages/CounselorPage'));
const FunTowerPage=lazy(()=>import('@/pages/FunTowerPage'));
const ExplorePlazaPage=lazy(()=>import('@/pages/ExplorePlazaPage'));
const SocialPlazaPage=lazy(()=>import('@/pages/SocialPlazaPage'));
const SettingsPage=lazy(()=>import('@/pages/SettingsPage'));
const OpsPage=lazy(()=>import('@/pages/OpsPage'));
function AuthBoot({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const reload = useSchoolStore((s) => s.reloadFromAccountStorage);
  const createSchool = useSchoolStore((s) => s.createSchool);
  const setIqeResult = useSchoolStore((s) => s.setIqeResult);
  const setEditionPrefs = useSchoolStore((s) => s.setEditionPrefs);

  useEffect(() => {
    void (async () => {
      try {
      await hydrateAuthFromSession();
      reload();
      // 已登录但本地无档案时，尝试从云端拉取
      if (getStoredContact() && !useSchoolStore.getState().student) {
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
        }
      }
      } catch {
        toast.error('账号恢复暂未完成，已保留本地资料，请稍后重试登录。');
      } finally { setReady(true); }
    })();
  }, [reload, createSchool, setIqeResult, setEditionPrefs]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-campus-ink/60">加载中…</div>
    );
  }
  return <>{children}</>;
}


function AccountGate(){const student=useSchoolStore(s=>s.student);return student&&getStoredContact()?<><GuardianPolicyRefresh/><Outlet/></>:<Navigate to="/onboarding" replace/>;}
function EntryGate(){const s=useSchoolStore();return s.student&&getStoredContact()?<Navigate to={'/'+(studentStage(s)==='campus'?'':studentStage(s))} replace/>:<OnboardingPage/>;}
function SetupGate(){const s=useSchoolStore();return studentStage(s)==='assessment'?<Navigate to="/assessment" replace/>:<SchoolSetupPage/>;}
function CampusLayout(){
 const s=useSchoolStore(),stage=studentStage(s),loc=useLocation();
 if(stage!=='campus')return <Navigate to={'/'+stage} replace/>;
 if(loc.pathname.startsWith('/hall/')&&!canAccessSubject(loc.pathname.split('/')[2])||loc.pathname==='/social'&&(!canAccessSocial()||!s.parent.allowSocial)||loc.pathname==='/fun'&&!canAccessFunTower())return <Navigate to="/" replace/>;
 // 只有完成测评和配置后才挂载校园运行时。测评不共享校园提醒、归档、导航或管控弹层。
 return <CampusRuntime><Outlet/></CampusRuntime>;
}
export default function App(){return <AuthBoot><Suspense fallback={<div className="p-8 text-center">正在打开页面…</div>}><Routes>
 <Route path="/onboarding" element={<EntryGate/>}/><Route path="/register" element={<Navigate to="/onboarding" replace/>}/><Route path="/login" element={<LoginPage/>}/>
 <Route element={<AccountGate/>}>
  <Route path="/assessment" element={<AssessmentRoomPage/>}/><Route path="/english-exam" element={<EnglishExamPage/>}/><Route path="/iqe" element={<Navigate to="/assessment" replace/>}/><Route path="/setup" element={<SetupGate/>}/>
  <Route element={<CampusLayout/>}>
   <Route path="/" element={<CampusPage/>}/><Route path="/settings" element={<SettingsPage/>}/><Route path="/ops" element={<OpsPage/>}/><Route path="/hall/:subject" element={<SubjectHallPage/>}/><Route path="/lab" element={<FreeLabPage/>}/><Route path="/principal" element={<PrincipalPage/>}/><Route path="/counselor" element={<CounselorPage/>}/><Route path="/fun" element={<FunTowerPage/>}/><Route path="/explore" element={<ExplorePlazaPage/>}/><Route path="/social" element={<SocialPlazaPage/>}/>
  </Route>
 </Route><Route path="*" element={<Navigate to="/" replace/>}/>
 </Routes></Suspense></AuthBoot>;}
