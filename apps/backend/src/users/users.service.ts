import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { ChangePasswordInput, UpdateProfileInput, User } from '@min-trello/shared';
import { ErrorCode } from '../common/errors';
import { BCRYPT_ROUNDS } from '../auth/auth.constants';
import {
  REFRESH_TOKEN_REPOSITORY_TOKEN,
  type IRefreshTokenRepository,
} from '../auth/repositories/refresh-token.repository';
import { USER_REPOSITORY_TOKEN, type IUserRepository } from './repositories/user.repository';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY_TOKEN)
    private readonly refreshRepo: IRefreshTokenRepository,
  ) {}

  async list(userId: string): Promise<User[]> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedException({ error: ErrorCode.UNAUTHORIZED, message: 'Unauthorized' });
    }

    return [user];
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
    return this.userRepo.update(userId, { name: input.name });
  }

  async changePassword(
    user: { id: string; email: string },
    input: ChangePasswordInput,
  ): Promise<void> {
    const record = await this.userRepo.findByEmail(user.email);
    if (!record) {
      throw new UnauthorizedException({ error: ErrorCode.UNAUTHORIZED, message: 'Unauthorized' });
    }

    const matches = await bcrypt.compare(input.oldPassword, record.password);
    if (!matches) {
      throw new BadRequestException('Invalid current password');
    }

    const password = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
    await this.userRepo.updatePassword(user.id, password);
    await this.refreshRepo.revokeAllForUser(user.id);
  }
}
