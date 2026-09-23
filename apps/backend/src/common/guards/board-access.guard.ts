import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../errors';
import { BoardAccessResolver, type BoardRequest } from '../resolvers/board-access.resolver';
import {
  BOARD_REPOSITORY_TOKEN,
  type IBoardRepository,
} from '../../boards/repositories/board.repository';

@Injectable()
export class BoardAccessGuard implements CanActivate {
  constructor(
    private readonly resolver: BoardAccessResolver,
    @Inject(BOARD_REPOSITORY_TOKEN)
    private readonly boards: IBoardRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<BoardRequest>();

    const boardId = await this.resolver.resolveBoardId(req);
    if (!boardId) {
      return true;
    }

    const board = await this.boards.findById(boardId);
    if (!board || board.ownerId !== req.user.id) {
      throw new NotFoundException({
        error: ErrorCode.BOARD_NOT_FOUND,
        message: 'Board not found',
      });
    }

    req.board = board;
    return true;
  }
}
