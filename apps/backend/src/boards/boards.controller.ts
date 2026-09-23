import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Board, BoardListItem, BoardWithColumns, Paginated } from '@min-trello/shared';
import { ClientId } from '../common/decorators/client-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BoardAccessGuard } from '../common/guards/board-access.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { ListBoardsDto } from './dto/list-boards.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@ApiTags('boards')
@ApiBearerAuth()
@UseGuards(BoardAccessGuard)
@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListBoardsDto,
  ): Promise<Paginated<BoardListItem>> {
    return this.boardsService.list(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBoardDto): Promise<Board> {
    return this.boardsService.create(user.id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<BoardWithColumns> {
    return this.boardsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBoardDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientId() clientId: string | null,
  ): Promise<Board> {
    return this.boardsService.update(id, dto, user.id, clientId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.boardsService.remove(id, user.id);
  }
}
