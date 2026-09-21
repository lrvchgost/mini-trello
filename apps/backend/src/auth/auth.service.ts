import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { RegisterInput, User } from '@min-trello/shared';
import { ErrorCode } from '../common/errors';
import { isUniqueConstraintError } from '../common/prisma-errors';
import { APP_ENV, type AppEnv } from '../config/env';
import {
  REFRESH_TOKEN_REPOSITORY_TOKEN,
  type IRefreshTokenRepository,
} from './repositories/refresh-token.repository';
import { USER_REPOSITORY_TOKEN, type IUserRepository } from '../users/repositories/user.repository';
import { BCRYPT_ROUNDS } from './auth.constants';
import type { AccessTokenPayload, AuthenticatedUser, AuthSession } from './auth.types';
import { generateRefreshToken, hashToken, parseDurationMs } from './auth.util';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY_TOKEN)
    private readonly refreshRepo: IRefreshTokenRepository,
    private readonly jwt: JwtService,
    @Inject(APP_ENV)
    private readonly env: AppEnv,
  ) {}

  async register(input: RegisterInput): Promise<AuthSession> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw this.emailTaken();
    }

    const password = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    let user: User;
    try {
      user = await this.userRepo.create({ email: input.email, name: input.name, password });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw this.emailTaken();
      }
      throw error;
    }

    await this.cleanupExpired();
    return this.issueTokens(user);
  }

  async validateCredentials(email: string, password: string): Promise<AuthenticatedUser> {
    if (!email || !password) {
      throw this.invalidCredentials();
    }

    const record = await this.userRepo.findByEmail(email);
    if (!record) {
      throw this.invalidCredentials();
    }

    const matches = await bcrypt.compare(password, record.password);
    if (!matches) {
      throw this.invalidCredentials();
    }

    return { id: record.id, email: record.email };
  }

  async login(user: AuthenticatedUser): Promise<AuthSession> {
    const profile = await this.userRepo.findById(user.id);
    if (!profile) {
      throw this.invalidCredentials();
    }

    await this.cleanupExpired();
    return this.issueTokens(profile);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthSession> {
    if (!refreshToken) {
      throw this.invalidRefresh();
    }

    const tokenHash = hashToken(refreshToken);
    const record = await this.refreshRepo.findByHash(tokenHash);
    if (!record) {
      throw this.invalidRefresh();
    }

    const now = Date.now();

    if (record.expiresAt.getTime() <= now) {
      await this.refreshRepo.revoke(record.id);
      throw this.invalidRefresh();
    }

    if (record.revokedAt) {
      const graceMs = this.env.REFRESH_GRACE_SECONDS * 1_000;
      if (now - record.revokedAt.getTime() > graceMs) {
        throw this.invalidRefresh();
      }
    } else {
      await this.refreshRepo.revoke(record.id);
    }

    const user = await this.userRepo.findById(record.userId);
    if (!user) {
      throw this.invalidRefresh();
    }

    return this.issueTokens(user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.refreshRepo.removeByHash(hashToken(refreshToken));
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw this.invalidCredentials();
    }
    return user;
  }

  private async issueTokens(user: User): Promise<AuthSession> {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + parseDurationMs(this.env.JWT_REFRESH_EXPIRES_IN));

    await this.refreshRepo.create({
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt,
    });

    return { user, accessToken, refreshToken };
  }

  private async cleanupExpired(): Promise<void> {
    await this.refreshRepo.deleteExpired();
  }

  private emailTaken(): ConflictException {
    return new ConflictException({
      error: ErrorCode.EMAIL_TAKEN,
      message: 'Email is already registered',
    });
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      error: ErrorCode.UNAUTHORIZED,
      message: 'Invalid email or password',
    });
  }

  private invalidRefresh(): UnauthorizedException {
    return new UnauthorizedException({
      error: ErrorCode.UNAUTHORIZED,
      message: 'Invalid refresh token',
    });
  }
}
