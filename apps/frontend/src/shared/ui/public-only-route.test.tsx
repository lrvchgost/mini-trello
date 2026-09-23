import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/store';
import { PublicOnlyRoute } from './public-only-route';

function renderAt(entry: string | { pathname: string; state: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<div>login form</div>} />
        </Route>
        <Route path="/dashboard" element={<div>dashboard page</div>} />
        <Route path="/boards/:id" element={<div>board page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PublicOnlyRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'unauthenticated', user: null, error: null });
  });

  it('renders the public screen for anonymous users', () => {
    renderAt('/login');
    expect(screen.getByText('login form')).toBeInTheDocument();
  });

  it('redirects authenticated users to the dashboard', () => {
    useAuthStore.setState({ status: 'authenticated' });
    renderAt('/login');
    expect(screen.getByText('dashboard page')).toBeInTheDocument();
  });

  it('redirects authenticated users back to the requested page', () => {
    useAuthStore.setState({ status: 'authenticated' });
    renderAt({ pathname: '/login', state: { from: '/boards/board-1' } });
    expect(screen.getByText('board page')).toBeInTheDocument();
  });
});
