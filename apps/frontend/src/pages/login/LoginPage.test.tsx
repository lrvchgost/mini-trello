import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeHttpError } from '@/test/http-error';
import { LoginPage } from './LoginPage';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  navigate: vi.fn(),
  state: null as { from?: string } | null,
}));

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    user: null,
    status: 'unauthenticated',
    error: null,
    login: mocks.login,
    register: vi.fn(),
    logout: vi.fn(),
    bootstrap: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useLocation: () => ({
      state: mocks.state,
      pathname: '/login',
      search: '',
      hash: '',
      key: 'test',
    }),
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    mocks.login.mockReset();
    mocks.navigate.mockReset();
    mocks.state = null;
  });

  it('validates the form before submitting', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /войти/i }));

    expect(await screen.findByText('Некорректное значение')).toBeInTheDocument();
    expect(screen.getByText('Обязательное поле')).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('logs in and redirects to the dashboard on success', async () => {
    const user = userEvent.setup();
    mocks.login.mockResolvedValue(undefined);
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'password123');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() =>
      expect(mocks.login).toHaveBeenCalledWith({
        email: 'alice@example.com',
        password: 'password123',
      }),
    );
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith('/dashboard', { replace: true }),
    );
  });

  it('returns to the requested page after login', async () => {
    const user = userEvent.setup();
    mocks.login.mockResolvedValue(undefined);
    mocks.state = { from: '/boards/board-1' };
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'password123');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith('/boards/board-1', { replace: true }),
    );
  });

  it('shows a localized error when credentials are rejected', async () => {
    const user = userEvent.setup();
    mocks.login.mockRejectedValue(
      makeHttpError(401, { error: 'UNAUTHORIZED', message: 'Invalid email or password' }),
    );
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный email или пароль');
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
