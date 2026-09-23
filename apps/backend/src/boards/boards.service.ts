import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Board,
  BoardListQuery,
  BoardWithColumns,
  CreateBoardInput,
  Paginated,
  UpdateBoardInput,
} from '@min-trello/shared';
import { ErrorCode } from '../common/errors';
import { BOARD_REPOSITORY_TOKEN, type IBoardRepository } from './repositories/board.repository';

@Injectable()
export class BoardsService {
  constructor(
    @Inject(BOARD_REPOSITORY_TOKEN)
    private readonly boardRepo: IBoardRepository,
  ) {}

  list(ownerId: string, query: BoardListQuery): Promise<Paginated<Board>> {
    return this.boardRepo.findByOwner(ownerId, query.page, query.limit, query.search);
  }

  create(ownerId: string, input: CreateBoardInput): Promise<Board> {
    return this.boardRepo.create({ title: input.title, ownerId });
  }

  async findOne(id: string): Promise<BoardWithColumns> {
    const board = await this.boardRepo.findByIdWithColumns(id);
    if (!board) {
      throw new NotFoundException({
        error: ErrorCode.BOARD_NOT_FOUND,
        message: 'Board not found',
      });
    }
    return board;
  }

  update(id: string, input: UpdateBoardInput): Promise<Board> {
    return this.boardRepo.update(id, input);
  }

  remove(id: string): Promise<void> {
    return this.boardRepo.delete(id);
  }
}
