import { Injectable } from '@nestjs/common';
import type { Label } from '@min-trello/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { ILabelRepository } from './label.repository';

@Injectable()
export class PrismaLabelRepository implements ILabelRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Label | null> {
    return this.prisma.label.findUnique({ where: { id } });
  }

  findByBoard(boardId: string): Promise<Label[]> {
    return this.prisma.label.findMany({ where: { boardId }, orderBy: { name: 'asc' } });
  }

  create(data: { name: string; color: string; boardId: string }): Promise<Label> {
    return this.prisma.label.create({ data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.label.delete({ where: { id } });
  }

  async attachToCard(cardId: string, labelId: string): Promise<void> {
    await this.prisma.cardLabel.createMany({
      data: { cardId, labelId },
      skipDuplicates: true,
    });
  }

  async detachFromCard(cardId: string, labelId: string): Promise<void> {
    await this.prisma.cardLabel.deleteMany({ where: { cardId, labelId } });
  }
}
