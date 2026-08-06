import { Navigate, Route, Routes } from 'react-router-dom';
import { useSchoolStore } from '@/store/school';
import OnboardingPage from '@/pages/OnboardingPage';
import CampusPage from '@/pages/CampusPage';
import SubjectHallPage from '@/pages/SubjectHallPage';
import PrincipalPage from '@/pages/PrincipalPage';
import CounselorPage from '@/pages/CounselorPage';
import FunTowerPage from '@/pages/FunTowerPage';
import ExplorePlazaPage from '@/pages/ExplorePlazaPage';
import SocialPlazaPage from '@/pages/SocialPlazaPage';
import ParentCenterPage from '@/pages/ParentCenterPage';
import SettingsPage from '@/pages/SettingsPage';

function Guard({ children }: { children: React.ReactNode }) {
  const student = useSchoolStore((s) => s.student);
  if (!student) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route
        path="/"
        element={
          <Guard>
            <CampusPage />
          </Guard>
        }
      />
      <Route
        path="/hall/:subject"
        element={
          <Guard>
            <SubjectHallPage />
          </Guard>
        }
      />
      <Route
        path="/principal"
        element={
          <Guard>
            <PrincipalPage />
          </Guard>
        }
      />
      <Route
        path="/counselor"
        element={
          <Guard>
            <CounselorPage />
          </Guard>
        }
      />
      <Route
        path="/fun"
        element={
          <Guard>
            <FunTowerPage />
          </Guard>
        }
      />
      <Route
        path="/explore"
        element={
          <Guard>
            <ExplorePlazaPage />
          </Guard>
        }
      />
      <Route
        path="/social"
        element={
          <Guard>
            <SocialPlazaPage />
          </Guard>
        }
      />
      <Route
        path="/parent"
        element={
          <Guard>
            <ParentCenterPage />
          </Guard>
        }
      />
      <Route
        path="/settings"
        element={
          <Guard>
            <SettingsPage />
          </Guard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
