import type { ActivityLog, Paginated } from '@min-trello/shared';

export const ACTIVITY_REPOSITORY_TOKEN = 'ACTIVITY_REPOSITORY';

export interface IActivityRepository {
  create(data: {
    boardId: string;
    action: string;
    payload?: unknown;
    userId: string;
    cardId?: string | null;
  }): Promise<ActivityLog>;
  findByBoard(boardId: string, page?: number, limit?: number): Promise<Paginated<ActivityLog>>;
}
