import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Board, BoardListItem, BoardWithColumns, Paginated } from '@min-trello/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { IBoardRepository } from './board.repository';

@Injectable()
export class PrismaBoardRepository implements IBoardRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Board | null> {
    return this.prisma.board.findUnique({ where: { id } });
  }

  findByIdWithColumns(id: string): Promise<BoardWithColumns | null> {
    return this.prisma.board.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: { cards: { orderBy: { order: 'asc' } } },
        },
      },
    });
  }

  async findByOwner(
    ownerId: string,
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<Paginated<BoardListItem>> {
    const where: Prisma.BoardWhereInput = {
      ownerId,
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.board.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { columns: { select: { _count: { select: { cards: true } } } } },
      }),
      this.prisma.board.count({ where }),
    ]);

    const items = rows.map(({ columns, ...board }) => ({
      ...board,
      cardsCount: columns.reduce((sum, column) => sum + column._count.cards, 0),
    }));

    return { items, total, page, limit };
  }

  create(data: { title: string; ownerId: string }): Promise<Board> {
    return this.prisma.board.create({ data });
  }

  update(id: string, data: { title?: string }): Promise<Board> {
    return this.prisma.board.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.board.delete({ where: { id } });
  }
}
