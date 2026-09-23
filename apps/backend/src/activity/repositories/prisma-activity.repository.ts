import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ActivityLog, Paginated } from '@min-trello/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { IActivityRepository } from './activity.repository';

@Injectable()
export class PrismaActivityRepository implements IActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    boardId: string;
    action: string;
    payload?: unknown;
    userId: string;
    cardId?: string | null;
  }): Promise<ActivityLog> {
    return this.prisma.activityLog.create({
      data: {
        boardId: data.boardId,
        action: data.action,
        userId: data.userId,
        cardId: data.cardId ?? null,
        ...(data.payload === undefined ? {} : { payload: data.payload as Prisma.InputJsonValue }),
      },
    });
  }

  async findByBoard(boardId: string, page = 1, limit = 20): Promise<Paginated<ActivityLog>> {
    const where = { boardId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
