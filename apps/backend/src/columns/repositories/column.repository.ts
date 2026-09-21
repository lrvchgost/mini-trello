import type { Column } from '@min-trello/shared';

export const COLUMN_REPOSITORY_TOKEN = 'COLUMN_REPOSITORY';

export interface IColumnRepository {
  findById(id: string): Promise<Column | null>;
  findByBoard(boardId: string): Promise<Column[]>;
  create(data: { title: string; boardId: string }): Promise<Column>;
  update(id: string, data: { title?: string; isDone?: boolean; order?: number }): Promise<Column>;
  delete(id: string): Promise<void>;
}
