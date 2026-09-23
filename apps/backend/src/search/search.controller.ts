import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Card, Paginated } from '@min-trello/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BoardAccessGuard } from '../common/guards/board-access.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(BoardAccessGuard)
@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('boards/:id/search')
  searchBoard(
    @Param('id') boardId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchQueryDto,
  ): Promise<Paginated<Card>> {
    return this.searchService.searchBoard(boardId, user.id, query);
  }

  @Get('search')
  search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchQueryDto,
  ): Promise<Paginated<Card>> {
    return this.searchService.searchGlobal(user.id, query);
  }
}
