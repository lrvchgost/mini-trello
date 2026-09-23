import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Board, CardDetail, Label } from '@min-trello/shared';
import { CurrentBoard } from '../common/decorators/current-board.decorator';
import { BoardAccessGuard } from '../common/guards/board-access.guard';
import { AddLabelDto } from './dto/add-label.dto';
import { CreateLabelDto } from './dto/create-label.dto';
import { LabelsService } from './labels.service';

@ApiTags('labels')
@ApiBearerAuth()
@UseGuards(BoardAccessGuard)
@Controller()
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post('boards/:boardId/labels')
  create(@Param('boardId') boardId: string, @Body() dto: CreateLabelDto): Promise<Label> {
    return this.labelsService.create(boardId, dto);
  }

  @Get('boards/:boardId/labels')
  findByBoard(@Param('boardId') boardId: string): Promise<Label[]> {
    return this.labelsService.findByBoard(boardId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('labels/:id')
  remove(@Param('id') id: string): Promise<void> {
    return this.labelsService.remove(id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('cards/:cardId/labels')
  attach(
    @Param('cardId') cardId: string,
    @Body() dto: AddLabelDto,
    @CurrentBoard() board: Board,
  ): Promise<CardDetail> {
    return this.labelsService.attach(cardId, dto.labelId, board.id);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('cards/:cardId/labels/:labelId')
  detach(@Param('cardId') cardId: string, @Param('labelId') labelId: string): Promise<void> {
    return this.labelsService.detach(cardId, labelId);
  }
}
