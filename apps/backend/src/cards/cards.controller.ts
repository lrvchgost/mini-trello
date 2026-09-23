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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BoardAccessGuard } from '../common/guards/board-access.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
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
  create(
    @Param('columnId') columnId: string,
    @Body() dto: CreateCardDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBoard() board?: Board,
  ): Promise<Card> {
    return this.cardsService.create(columnId, dto, user.id, board?.id);
  }

  @Get('cards/:id')
  findOne(@Param('id') id: string): Promise<CardDetail> {
    return this.cardsService.findOne(id);
  }

  @Patch('cards/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCardDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBoard() board?: Board,
  ): Promise<Card> {
    return this.cardsService.update(id, dto, user.id, board?.id);
  }

  @Patch('cards/:id/move')
  move(
    @Param('id') id: string,
    @Body() dto: MoveCardDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBoard() board?: Board,
  ): Promise<MoveCardResult> {
    return this.cardsService.move(id, dto, user.id, board?.id);
  }

  @Patch('cards/:id/assignee')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignCardDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBoard() board?: Board,
  ): Promise<Card> {
    return this.cardsService.assign(id, dto, user.id, board?.id);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('cards/:id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBoard() board?: Board,
  ): Promise<void> {
    return this.cardsService.remove(id, user.id, board?.id);
  }
}
