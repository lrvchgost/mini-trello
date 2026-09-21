import type { Card, CreateCardInput, UpdateCardInput } from '@min-trello/shared';

export const CARD_REPOSITORY_TOKEN = 'CARD_REPOSITORY';

export interface ICardRepository {
  findById(id: string): Promise<Card | null>;
  findManyByColumn(columnId: string): Promise<Card[]>;
  create(data: CreateCardInput & { columnId: string }): Promise<Card>;
  update(id: string, data: UpdateCardInput): Promise<Card>;
  move(cardId: string, targetColumnId: string, targetOrder: number): Promise<void>;
  setAssignee(id: string, assigneeId: string | null): Promise<Card>;
  remove(id: string): Promise<void>;
}
