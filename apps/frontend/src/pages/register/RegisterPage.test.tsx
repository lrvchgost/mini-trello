import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeHttpError } from '@/test/http-error';
import { RegisterPage } from './RegisterPage';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    user: null,
    status: 'unauthenticated',
    error: null,
    login: vi.fn(),
    register: mocks.register,
    logout: vi.fn(),
    bootstrap: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    mocks.register.mockReset();
    mocks.navigate.mockReset();
  });

  it('validates the form before submitting', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /создать аккаунт/i }));

    expect(await screen.findByText('Некорректное значение')).toBeInTheDocument();
    expect(screen.getAllByText('Обязательное поле').length).toBeGreaterThanOrEqual(2);
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it('rejects a password shorter than the minimum', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Имя'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'short');
    await user.click(screen.getByRole('button', { name: /создать аккаунт/i }));

    expect(await screen.findByText('Минимум 8 символов')).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it('registers and redirects to the dashboard on success', async () => {
    const user = userEvent.setup();
    mocks.register.mockResolvedValue(undefined);
    renderPage();

    await user.type(screen.getByLabelText('Имя'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'password123');
    await user.click(screen.getByRole('button', { name: /создать аккаунт/i }));

    await waitFor(() =>
      expect(mocks.register).toHaveBeenCalledWith({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'password123',
      }),
    );
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith('/dashboard', { replace: true }),
    );
  });

  it('shows a field error when the email is already taken', async () => {
    const user = userEvent.setup();
    mocks.register.mockRejectedValue(
      makeHttpError(409, { error: 'EMAIL_TAKEN', message: 'Email is already registered' }),
    );
    renderPage();

    await user.type(screen.getByLabelText('Имя'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'password123');
    await user.click(screen.getByRole('button', { name: /создать аккаунт/i }));

    expect(await screen.findByText('Этот email уже зарегистрирован')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
