import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Comment, Paginated } from '@min-trello/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BoardAccessGuard } from '../common/guards/board-access.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListCommentsDto } from './dto/list-comments.dto';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(BoardAccessGuard)
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('cards/:cardId/comments')
  list(
    @Param('cardId') cardId: string,
    @Query() query: ListCommentsDto,
  ): Promise<Paginated<Comment>> {
    return this.commentsService.list(cardId, query.page, query.limit);
  }

  @Post('cards/:cardId/comments')
  create(
    @Param('cardId') cardId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Comment> {
    return this.commentsService.create(cardId, dto, user.id);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('comments/:id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.commentsService.remove(id, user.id);
  }
}
