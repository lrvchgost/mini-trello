import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <main>
      <header>
        <h1>min-trello</h1>
        <span>{user?.name}</span>
        <button type="button" onClick={handleLogout}>
          Выйти
        </button>
      </header>
      <p>Каркас приложения готов. Список досок и графики появятся на шаге 5.4.</p>
    </main>
  );
}
