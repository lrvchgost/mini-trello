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
import { BoardAccessGuard } from '../common/guards/board-access.guard';
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
  create(@Param('boardId') boardId: string, @Body() dto: CreateColumnDto): Promise<Column> {
    return this.columnsService.create(boardId, dto);
  }

  @Patch('columns/:id')
  update(@Param('id') id: string, @Body() dto: UpdateColumnDto): Promise<Column> {
    return this.columnsService.update(id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('columns/:id')
  remove(@Param('id') id: string): Promise<void> {
    return this.columnsService.remove(id);
  }
}
