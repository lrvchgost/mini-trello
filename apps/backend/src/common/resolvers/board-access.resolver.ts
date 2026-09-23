import { Inject, Injectable } from '@nestjs/common';
import type { Board } from '@min-trello/shared';
import type { AuthenticatedUser } from '../../auth/auth.types';
import {
  CARD_REPOSITORY_TOKEN,
  type ICardRepository,
} from '../../cards/repositories/card.repository';
import {
  COMMENT_REPOSITORY_TOKEN,
  type ICommentRepository,
} from '../../comments/repositories/comment.repository';
import {
  COLUMN_REPOSITORY_TOKEN,
  type IColumnRepository,
} from '../../columns/repositories/column.repository';
import {
  LABEL_REPOSITORY_TOKEN,
  type ILabelRepository,
} from '../../labels/repositories/label.repository';

/**
 * Минимальная форма HTTP-запроса, нужная для определения ресурса доски.
 * Не тянем express-типы, чтобы резолвер не зависел от транспорта.
 */
export interface BoardRequest {
  method: string;
  path: string;
  params: Record<string, string | undefined>;
  route?: { path?: string };
  user: AuthenticatedUser;
  board?: Board;
}

/** Убирает глобальный префикс `/api`, не трогая остальной путь. */
export function normalizeRoutePath(path: string): string {
  const stripped = path.replace(/^\/api(?=\/|$)/, '');
  return stripped.length > 0 ? stripped : '/';
}

const BOARD_RESOURCE_METHODS = new Set(['GET', 'PATCH', 'DELETE']);

@Injectable()
export class BoardAccessResolver {
  constructor(
    @Inject(COLUMN_REPOSITORY_TOKEN)
    private readonly columns: IColumnRepository,
    @Inject(CARD_REPOSITORY_TOKEN)
    private readonly cards: ICardRepository,
    @Inject(LABEL_REPOSITORY_TOKEN)
    private readonly labels: ILabelRepository,
    @Inject(COMMENT_REPOSITORY_TOKEN)
    private readonly comments: ICommentRepository,
  ) {}

  /**
   * Возвращает `boardId` ресурса из запроса либо `null`, если маршрут не привязан
   * к конкретной доске (например, список/создание досок).
   */
  async resolveBoardId(req: BoardRequest): Promise<string | null> {
    const route = normalizeRoutePath(req.route?.path ?? req.path);
    const method = req.method.toUpperCase();

    if (route === '/boards/:id' && BOARD_RESOURCE_METHODS.has(method)) {
      return req.params.id ?? null;
    }

    if (
      (route === '/boards/:id/activity' || route === '/boards/:id/activity/stream') &&
      method === 'GET'
    ) {
      return req.params.id ?? null;
    }

    if (route === '/boards/:id/search' && method === 'GET') {
      return req.params.id ?? null;
    }

    if (route === '/boards/:boardId/columns' && method === 'POST') {
      return req.params.boardId ?? null;
    }

    if (route === '/boards/:boardId/labels' && (method === 'GET' || method === 'POST')) {
      return req.params.boardId ?? null;
    }

    if (route === '/columns/:id' && (method === 'PATCH' || method === 'DELETE')) {
      return this.resolveColumnBoard(req.params.id);
    }

    if (route === '/columns/:columnId/cards' && method === 'POST') {
      return this.resolveColumnBoard(req.params.columnId);
    }

    if (route === '/cards/:id' && (method === 'GET' || method === 'PATCH' || method === 'DELETE')) {
      return this.resolveCardBoard(req.params.id);
    }

    if (route === '/cards/:id/move' && method === 'PATCH') {
      return this.resolveCardBoard(req.params.id);
    }

    if (route === '/cards/:id/assignee' && method === 'PATCH') {
      return this.resolveCardBoard(req.params.id);
    }

    if (route === '/cards/:cardId/labels' && method === 'POST') {
      return this.resolveCardBoard(req.params.cardId);
    }

    if (route === '/cards/:cardId/labels/:labelId' && method === 'DELETE') {
      return this.resolveCardBoard(req.params.cardId);
    }

    if (route === '/labels/:id' && method === 'DELETE') {
      return this.resolveLabelBoard(req.params.id);
    }

    if (route === '/cards/:cardId/comments' && (method === 'GET' || method === 'POST')) {
      return this.resolveCardBoard(req.params.cardId);
    }

    if (route === '/comments/:id' && method === 'DELETE') {
      return this.resolveCommentBoard(req.params.id);
    }

    return null;
  }

  private async resolveColumnBoard(columnId?: string): Promise<string | null> {
    if (!columnId) {
      return null;
    }
    const column = await this.columns.findById(columnId);
    return column?.boardId ?? null;
  }

  private async resolveCardBoard(cardId?: string): Promise<string | null> {
    if (!cardId) {
      return null;
    }
    const card = await this.cards.findById(cardId);
    if (!card) {
      return null;
    }
    return this.resolveColumnBoard(card.columnId);
  }

  private async resolveLabelBoard(labelId?: string): Promise<string | null> {
    if (!labelId) {
      return null;
    }
    const label = await this.labels.findById(labelId);
    return label?.boardId ?? null;
  }

  private async resolveCommentBoard(commentId?: string): Promise<string | null> {
    if (!commentId) {
      return null;
    }
    const comment = await this.comments.findById(commentId);
    if (!comment) {
      return null;
    }
    return this.resolveCardBoard(comment.cardId);
  }
}
