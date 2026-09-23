import { Injectable } from '@nestjs/common';
import type { Card, Paginated } from '@min-trello/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { buildCardSearchWhere } from '../search.where';
import type { ISearchRepository, SearchCardsQuery } from './search.repository';

@Injectable()
export class PrismaSearchRepository implements ISearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchCards(query: SearchCardsQuery): Promise<Paginated<Card>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = buildCardSearchWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.card.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.card.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
