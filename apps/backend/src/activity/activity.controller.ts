import { Controller, Get, Param, Query, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Observable } from 'rxjs';
import type { ActivityLog, Paginated } from '@min-trello/shared';
import { BoardAccessGuard } from '../common/guards/board-access.guard';
import { ActivityService, type ActivityStreamEvent } from './activity.service';
import { ListActivityDto } from './dto/list-activity.dto';

@ApiTags('activity')
@ApiBearerAuth()
@UseGuards(BoardAccessGuard)
@Controller('boards/:id/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  list(
    @Param('id') boardId: string,
    @Query() query: ListActivityDto,
  ): Promise<Paginated<ActivityLog>> {
    return this.activityService.list(boardId, query.page, query.limit);
  }

  @Sse('stream')
  stream(@Param('id') boardId: string): Observable<ActivityStreamEvent> {
    return this.activityService.stream(boardId);
  }
}
