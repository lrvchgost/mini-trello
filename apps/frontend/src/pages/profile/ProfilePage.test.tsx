import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeHttpError } from '@/test/http-error';
import { ProfilePage } from './ProfilePage';

const mocks = vi.hoisted(() => ({
  user: {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  logout: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    user: mocks.user,
    status: 'authenticated',
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: mocks.logout,
    bootstrap: vi.fn(),
    updateProfile: mocks.updateProfile,
    changePassword: mocks.changePassword,
  }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mocks.navigate };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    mocks.updateProfile.mockReset();
    mocks.changePassword.mockReset();
    mocks.logout.mockReset();
    mocks.navigate.mockReset();
  });

  it('shows the account email and current name', () => {
    renderPage();

    expect(screen.getByLabelText('Email')).toHaveValue('alice@example.com');
    expect(screen.getByLabelText('Имя')).toHaveValue('Alice');
  });

  it('saves the new name and shows a confirmation', async () => {
    const userEventSetup = userEvent.setup();
    mocks.updateProfile.mockResolvedValue({ ...mocks.user, name: 'Alicia' });
    renderPage();

    const nameInput = screen.getByLabelText('Имя');
    await userEventSetup.clear(nameInput);
    await userEventSetup.type(nameInput, 'Alicia');
    await userEventSetup.click(screen.getByRole('button', { name: /сохранить имя/i }));

    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledWith({ name: 'Alicia' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Имя сохранено.');
  });

  it('requires a fresh login after changing the password', async () => {
    const userEventSetup = userEvent.setup();
    mocks.changePassword.mockResolvedValue(undefined);
    mocks.logout.mockResolvedValue(undefined);
    renderPage();

    await userEventSetup.type(screen.getByLabelText('Текущий пароль'), 'password123');
    await userEventSetup.type(screen.getByLabelText('Новый пароль'), 'newpassword123');
    await userEventSetup.click(screen.getByRole('button', { name: /сменить пароль/i }));

    await waitFor(() =>
      expect(mocks.changePassword).toHaveBeenCalledWith({
        oldPassword: 'password123',
        newPassword: 'newpassword123',
      }),
    );
    await waitFor(() => expect(mocks.logout).toHaveBeenCalled());
    expect(mocks.navigate).toHaveBeenCalledWith('/login', {
      replace: true,
      state: { notice: 'Пароль изменён. Войдите с новым паролем.' },
    });
  });

  it('shows an error when the current password is wrong', async () => {
    const userEventSetup = userEvent.setup();
    mocks.changePassword.mockRejectedValue(
      makeHttpError(400, { message: 'Invalid current password' }),
    );
    renderPage();

    await userEventSetup.type(screen.getByLabelText('Текущий пароль'), 'wrong-password');
    await userEventSetup.type(screen.getByLabelText('Новый пароль'), 'newpassword123');
    await userEventSetup.click(screen.getByRole('button', { name: /сменить пароль/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid current password');
    expect(mocks.logout).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('validates the password fields before submitting', async () => {
    const userEventSetup = userEvent.setup();
    renderPage();

    await userEventSetup.type(screen.getByLabelText('Текущий пароль'), 'x');
    await userEventSetup.type(screen.getByLabelText('Новый пароль'), 'x');
    await userEventSetup.click(screen.getByRole('button', { name: /сменить пароль/i }));

    expect(await screen.findByText('Минимум 8 символов')).toBeInTheDocument();
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });
});
