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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Board, Card, CardDetail } from '@min-trello/shared';
import { CurrentBoard } from '../common/decorators/current-board.decorator';
import { BoardAccessGuard } from '../common/guards/board-access.guard';
import { CardsService, type MoveCardResult } from './cards.service';
import { AssignCardDto } from './dto/assign-card.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@ApiTags('cards')
@ApiBearerAuth()
@UseGuards(BoardAccessGuard)
@Controller()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post('columns/:columnId/cards')
  create(@Param('columnId') columnId: string, @Body() dto: CreateCardDto): Promise<Card> {
    return this.cardsService.create(columnId, dto);
  }

  @Get('cards/:id')
  findOne(@Param('id') id: string): Promise<CardDetail> {
    return this.cardsService.findOne(id);
  }

  @Patch('cards/:id')
  update(@Param('id') id: string, @Body() dto: UpdateCardDto): Promise<Card> {
    return this.cardsService.update(id, dto);
  }

  @Patch('cards/:id/move')
  move(
    @Param('id') id: string,
    @Body() dto: MoveCardDto,
    @CurrentBoard() board: Board,
  ): Promise<MoveCardResult> {
    return this.cardsService.move(id, dto, board.id);
  }

  @Patch('cards/:id/assignee')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignCardDto,
    @CurrentBoard() board: Board,
  ): Promise<Card> {
    return this.cardsService.assign(id, dto, board.ownerId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('cards/:id')
  remove(@Param('id') id: string): Promise<void> {
    return this.cardsService.remove(id);
  }
}
