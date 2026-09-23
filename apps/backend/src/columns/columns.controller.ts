import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Column } from '@min-trello/shared';
import { ClientId } from '../common/decorators/client-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BoardAccessGuard } from '../common/guards/board-access.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@ApiTags('columns')
@ApiBearerAuth()
@UseGuards(BoardAccessGuard)
@Controller()
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Post('boards/:boardId/columns')
  create(
    @Param('boardId') boardId: string,
    @Body() dto: CreateColumnDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientId() clientId: string | null,
  ): Promise<Column> {
    return this.columnsService.create(boardId, dto, user.id, clientId);
  }

  @Patch('columns/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateColumnDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientId() clientId: string | null,
  ): Promise<Column> {
    return this.columnsService.update(id, dto, user.id, clientId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('columns/:id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientId() clientId: string | null,
  ): Promise<void> {
    return this.columnsService.remove(id, user.id, clientId);
  }
}
