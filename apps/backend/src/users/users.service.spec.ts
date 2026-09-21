import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { User } from '@min-trello/shared';
import type { IRefreshTokenRepository } from '../auth/repositories/refresh-token.repository';
import type { IUserRepository } from './repositories/user.repository';
import { UsersService } from './users.service';

const user: User = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<IUserRepository>;
  let refreshRepo: jest.Mocked<IRefreshTokenRepository>;

  beforeEach(() => {
    userRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updatePassword: jest.fn(),
    };
    refreshRepo = {
      create: jest.fn(),
      findByHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
      removeByHash: jest.fn(),
      deleteExpired: jest.fn(),
    };

    service = new UsersService(userRepo, refreshRepo);
  });

  describe('list', () => {
    it('returns only the current user', async () => {
      userRepo.findById.mockResolvedValue(user);

      await expect(service.list(user.id)).resolves.toEqual([user]);
    });

    it('rejects when the user no longer exists', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.list(user.id)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateProfile', () => {
    it('updates the name', async () => {
      const updated = { ...user, name: 'Alice Cooper' };
      userRepo.update.mockResolvedValue(updated);

      await expect(service.updateProfile(user.id, { name: 'Alice Cooper' })).resolves.toBe(updated);
      expect(userRepo.update).toHaveBeenCalledWith(user.id, { name: 'Alice Cooper' });
    });
  });

  describe('changePassword', () => {
    it('hashes the new password and revokes all refresh tokens', async () => {
      const password = await bcrypt.hash('password123', 10);
      userRepo.findByEmail.mockResolvedValue({ ...user, password });

      await service.changePassword(
        { id: user.id, email: user.email },
        { oldPassword: 'password123', newPassword: 'newPassword123' },
      );

      const hash = userRepo.updatePassword.mock.calls[0]![1];
      expect(hash).not.toBe('newPassword123');
      expect(await bcrypt.compare('newPassword123', hash)).toBe(true);
      expect(refreshRepo.revokeAllForUser).toHaveBeenCalledWith(user.id);
    });

    it('rejects a wrong current password without touching tokens', async () => {
      const password = await bcrypt.hash('password123', 10);
      userRepo.findByEmail.mockResolvedValue({ ...user, password });

      await expect(
        service.changePassword(
          { id: user.id, email: user.email },
          { oldPassword: 'nope', newPassword: 'newPassword123' },
        ),
      ).rejects.toThrow(BadRequestException);

      expect(userRepo.updatePassword).not.toHaveBeenCalled();
      expect(refreshRepo.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('rejects when the user no longer exists', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.changePassword(
          { id: user.id, email: user.email },
          { oldPassword: 'password123', newPassword: 'newPassword123' },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
