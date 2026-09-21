import type { Board, Paginated } from '@min-trello/shared';

export const BOARD_REPOSITORY_TOKEN = 'BOARD_REPOSITORY';

export interface IBoardRepository {
  findById(id: string): Promise<Board | null>;
  findByOwner(
    ownerId: string,
    page?: number,
    limit?: number,
    search?: string,
  ): Promise<Paginated<Board>>;
  create(data: { title: string; ownerId: string }): Promise<Board>;
  update(id: string, data: { title?: string }): Promise<Board>;
  delete(id: string): Promise<void>;
}
