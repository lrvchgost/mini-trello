import type { Card, CardDetail, CreateCardInput, UpdateCardInput } from '@min-trello/shared';

export const CARD_REPOSITORY_TOKEN = 'CARD_REPOSITORY';

export interface ICardRepository {
  findById(id: string): Promise<Card | null>;
  /** Карточка с исполнителем, метками и (позже) комментариями. */
  findDetailById(id: string): Promise<CardDetail | null>;
  findManyByColumn(columnId: string): Promise<Card[]>;
  /** Создаёт карточку с `order = max + 1` внутри колонки. */
  create(data: CreateCardInput & { columnId: string }): Promise<Card>;
  /**
   * Обновляет карточку. При `expectedUpdatedAt` применяет атомарный optimistic lock
   * (`updateMany`); устаревшая версия → `null` (сервис отдаёт `409`).
   */
  update(id: string, data: UpdateCardInput): Promise<Card | null>;
  /** Перемещает карточку и перенормирует порядок затронутых колонок в `0..n-1`. */
  move(cardId: string, targetColumnId: string, targetOrder: number): Promise<Card>;
  setAssignee(id: string, assigneeId: string | null): Promise<Card>;
  remove(id: string): Promise<void>;
}
