import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { DashboardStats, IDashboardRepository } from './dashboard.repository';

@Injectable()
export class PrismaDashboardRepository implements IDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(ownerId: string): Promise<DashboardStats> {
    const now = new Date();

    const [totalBoards, columns, overdueCards] = await this.prisma.$transaction([
      this.prisma.board.count({ where: { ownerId } }),
      this.prisma.column.findMany({
        where: { board: { ownerId } },
        orderBy: [{ boardId: 'asc' }, { order: 'asc' }],
        select: { id: true, title: true, _count: { select: { cards: true } } },
      }),
      this.prisma.card.count({
        where: {
          column: { board: { ownerId }, isDone: false },
          deadline: { lt: now },
        },
      }),
    ]);

    const cardsByStatus = columns.map((column) => ({
      columnId: column.id,
      columnTitle: column.title,
      count: column._count.cards,
    }));

    return {
      totalBoards,
      totalCards: cardsByStatus.reduce((sum, status) => sum + status.count, 0),
      cardsByStatus,
      overdueCards,
    };
  }
}
