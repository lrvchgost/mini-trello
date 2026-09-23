import type { Board, BoardListItem, BoardWithColumns, Paginated } from '@min-trello/shared';

export const BOARD_REPOSITORY_TOKEN = 'BOARD_REPOSITORY';

export interface IBoardRepository {
  findById(id: string): Promise<Board | null>;
  findByIdWithColumns(id: string): Promise<BoardWithColumns | null>;
  findByOwner(
    ownerId: string,
    page?: number,
    limit?: number,
    search?: string,
  ): Promise<Paginated<BoardListItem>>;
  create(data: { title: string; ownerId: string }): Promise<Board>;
  update(id: string, data: { title?: string }): Promise<Board>;
  delete(id: string): Promise<void>;
}
