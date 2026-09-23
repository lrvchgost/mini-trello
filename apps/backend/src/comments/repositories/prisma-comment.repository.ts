import { Injectable } from '@nestjs/common';
import type { Comment, Paginated } from '@min-trello/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { ICommentRepository } from './comment.repository';

const authorSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PrismaCommentRepository implements ICommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Comment | null> {
    return this.prisma.comment.findUnique({ where: { id } });
  }

  async findByCard(cardId: string, page = 1, limit = 20): Promise<Paginated<Comment>> {
    const where = { cardId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where,
        include: { author: { select: authorSelect } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  create(data: { content: string; cardId: string; authorId: string }): Promise<Comment> {
    return this.prisma.comment.create({
      data,
      include: { author: { select: authorSelect } },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.comment.delete({ where: { id } });
  }
}
