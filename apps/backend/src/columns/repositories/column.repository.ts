import type { Column } from '@min-trello/shared';

export const COLUMN_REPOSITORY_TOKEN = 'COLUMN_REPOSITORY';

export interface IColumnRepository {
  findById(id: string): Promise<Column | null>;
  findByBoard(boardId: string): Promise<Column[]>;
  /** Создаёт колонку с `order = max + 1` (с retry при гонке на `@@unique([boardId, order])`). */
  create(data: { title: string; boardId: string }): Promise<Column>;
  /** Обновляет поля и/или перенормирует порядок колонок доски в `0..n-1`. */
  update(id: string, data: { title?: string; isDone?: boolean; order?: number }): Promise<Column>;
  delete(id: string): Promise<void>;
}
