import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main>
      <h1>404</h1>
      <p>Страница не найдена.</p>
      <Link to="/dashboard">На главную</Link>
    </main>
  );
}
