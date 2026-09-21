import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { User } from '@min-trello/shared';
import type { AppEnv } from '../config/env';
import type { IUserRepository } from '../users/repositories/user.repository';
import { AuthService } from './auth.service';
import type { IRefreshTokenRepository } from './repositories/refresh-token.repository';
import { hashToken } from './auth.util';

const user: User = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const env: AppEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'test-secret-that-is-long-enough',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  REFRESH_GRACE_SECONDS: 60,
  COOKIE_SECURE: false,
  CORS_ORIGIN: 'http://localhost:5173',
  PORT: 3000,
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<IUserRepository>;
  let refreshRepo: jest.Mocked<IRefreshTokenRepository>;
  let jwt: { signAsync: jest.Mock };

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
      create: jest.fn().mockResolvedValue({}),
      findByHash: jest.fn(),
      revoke: jest.fn().mockResolvedValue(undefined),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
      removeByHash: jest.fn().mockResolvedValue(undefined),
      deleteExpired: jest.fn().mockResolvedValue(0),
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };

    service = new AuthService(userRepo, refreshRepo, jwt as unknown as JwtService, env);
  });

  describe('register', () => {
    it('hashes the password and issues a session', async () => {
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.create.mockResolvedValue(user);

      const session = await service.register({
        email: user.email,
        name: user.name,
        password: 'password123',
      });

      const created = userRepo.create.mock.calls[0]![0];
      expect(created.password).not.toBe('password123');
      expect(await bcrypt.compare('password123', created.password)).toBe(true);
      expect(session.user).toBe(user);
      expect(session.accessToken).toBe('access-token');
      expect(session.refreshToken).toEqual(expect.any(String));
      expect(refreshRepo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: user.id }));
    });

    it('rejects a duplicate email with EMAIL_TAKEN', async () => {
      userRepo.findByEmail.mockResolvedValue({ ...user, password: 'hash' });

      await expect(
        service.register({ email: user.email, name: user.name, password: 'password123' }),
      ).rejects.toThrow(ConflictException);
      expect(userRepo.create).not.toHaveBeenCalled();
    });

    it('maps a unique-constraint race to EMAIL_TAKEN', async () => {
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.register({ email: user.email, name: user.name, password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validateCredentials', () => {
    it('returns the authenticated user for a valid password', async () => {
      const password = await bcrypt.hash('password123', 10);
      userRepo.findByEmail.mockResolvedValue({ ...user, password });

      await expect(service.validateCredentials(user.email, 'password123')).resolves.toEqual({
        id: user.id,
        email: user.email,
      });
    });

    it('rejects a wrong password', async () => {
      const password = await bcrypt.hash('password123', 10);
      userRepo.findByEmail.mockResolvedValue({ ...user, password });

      await expect(service.validateCredentials(user.email, 'nope')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an unknown email', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateCredentials('missing@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('issues a session for an existing user', async () => {
      userRepo.findById.mockResolvedValue(user);

      const session = await service.login({ id: user.id, email: user.email });

      expect(session.user).toBe(user);
      expect(refreshRepo.deleteExpired).toHaveBeenCalled();
      expect(refreshRepo.create).toHaveBeenCalled();
    });

    it('rejects when the user no longer exists', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.login({ id: user.id, email: user.email })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    const activeRecord = {
      id: 'rt-1',
      tokenHash: hashToken('old-token'),
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    };

    it('rotates an active token and revokes the old one', async () => {
      refreshRepo.findByHash.mockResolvedValue(activeRecord);
      userRepo.findById.mockResolvedValue(user);

      const session = await service.refresh('old-token');

      expect(refreshRepo.revoke).toHaveBeenCalledWith(activeRecord.id);
      expect(session.refreshToken).not.toBe('old-token');
      expect(refreshRepo.create).toHaveBeenCalled();
    });

    it('rejects an unknown token', async () => {
      refreshRepo.findByHash.mockResolvedValue(null);

      await expect(service.refresh('nope')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a missing token', async () => {
      await expect(service.refresh(undefined)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired token', async () => {
      refreshRepo.findByHash.mockResolvedValue({
        ...activeRecord,
        expiresAt: new Date(Date.now() - 1_000),
      });

      await expect(service.refresh('old-token')).rejects.toThrow(UnauthorizedException);
      expect(refreshRepo.revoke).toHaveBeenCalledWith(activeRecord.id);
    });

    it('accepts a recently revoked token within the grace window', async () => {
      refreshRepo.findByHash.mockResolvedValue({
        ...activeRecord,
        revokedAt: new Date(Date.now() - 10_000),
      });
      userRepo.findById.mockResolvedValue(user);

      const session = await service.refresh('old-token');

      expect(session.refreshToken).toEqual(expect.any(String));
      expect(refreshRepo.create).toHaveBeenCalled();
    });

    it('rejects a revoked token outside the grace window', async () => {
      refreshRepo.findByHash.mockResolvedValue({
        ...activeRecord,
        revokedAt: new Date(Date.now() - 120_000),
      });

      await expect(service.refresh('old-token')).rejects.toThrow(UnauthorizedException);
      expect(refreshRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('removes the stored refresh token', async () => {
      await service.logout('old-token');

      expect(refreshRepo.removeByHash).toHaveBeenCalledWith(hashToken('old-token'));
    });

    it('does nothing without a token', async () => {
      await service.logout(undefined);

      expect(refreshRepo.removeByHash).not.toHaveBeenCalled();
    });
  });
});
