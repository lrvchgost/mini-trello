import type { Label } from '@min-trello/shared';

export const LABEL_REPOSITORY_TOKEN = 'LABEL_REPOSITORY';

export interface ILabelRepository {
  findById(id: string): Promise<Label | null>;
  findByBoard(boardId: string): Promise<Label[]>;
  create(data: { name: string; color: string; boardId: string }): Promise<Label>;
  remove(id: string): Promise<void>;
  attachToCard(cardId: string, labelId: string): Promise<void>;
  detachFromCard(cardId: string, labelId: string): Promise<void>;
}
