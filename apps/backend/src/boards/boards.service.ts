import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Board,
  BoardListQuery,
  BoardWithColumns,
  CreateBoardInput,
  Paginated,
  UpdateBoardInput,
} from '@min-trello/shared';
import { ActivityService } from '../activity/activity.service';
import { ErrorCode } from '../common/errors';
import { BOARD_REPOSITORY_TOKEN, type IBoardRepository } from './repositories/board.repository';

@Injectable()
export class BoardsService {
  constructor(
    @Inject(BOARD_REPOSITORY_TOKEN)
    private readonly boardRepo: IBoardRepository,
    private readonly activityService: ActivityService,
  ) {}

  list(ownerId: string, query: BoardListQuery): Promise<Paginated<Board>> {
    return this.boardRepo.findByOwner(ownerId, query.page, query.limit, query.search);
  }

  async create(ownerId: string, input: CreateBoardInput): Promise<Board> {
    const board = await this.boardRepo.create({ title: input.title, ownerId });
    await this.activityService.log(board.id, 'board.created', { title: board.title }, ownerId);
    return board;
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

  async update(id: string, input: UpdateBoardInput, actorId: string): Promise<Board> {
    const board = await this.boardRepo.update(id, input);
    await this.activityService.log(id, 'board.updated', { changes: input }, actorId);
    return board;
  }

  async remove(id: string, actorId: string): Promise<void> {
    await this.activityService.log(id, 'board.deleted', {}, actorId);
    await this.boardRepo.delete(id);
  }
}
