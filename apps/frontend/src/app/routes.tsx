import { Navigate, Route, Routes } from 'react-router-dom';
import { BoardPage } from '@/pages/board/BoardPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { LoginPage } from '@/pages/login/LoginPage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { RegisterPage } from '@/pages/register/RegisterPage';
import { SearchPage } from '@/pages/search/SearchPage';
import { ProtectedRoute } from '@/shared/ui/protected-route';
import { PublicOnlyRoute } from '@/shared/ui/public-only-route';
import { CardModal } from '@/widgets/card-modal';
import { AppLayout } from './layout/app-layout';
import { AuthLayout } from './layout/auth-layout';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/boards/:id" element={<BoardPage />}>
            <Route path="cards/:cardId" element={<CardModal />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
