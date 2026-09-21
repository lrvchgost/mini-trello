import { Injectable } from '@nestjs/common';
import type { User } from '@min-trello/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateUserData, IUserRepository, UserRecord } from './user.repository';

const userSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id }, select: userSelect });
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findMany(): Promise<User[]> {
    return this.prisma.user.findMany({ select: userSelect, orderBy: { createdAt: 'asc' } });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data, select: userSelect });
  }

  update(id: string, data: { name?: string }): Promise<User> {
    return this.prisma.user.update({ where: { id }, data, select: userSelect });
  }

  async updatePassword(id: string, password: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { password } });
  }
}
