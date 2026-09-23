import { Inject, Injectable } from '@nestjs/common';
import type { Board } from '@min-trello/shared';
import type { AuthenticatedUser } from '../../auth/auth.types';
import {
  COLUMN_REPOSITORY_TOKEN,
  type IColumnRepository,
} from '../../columns/repositories/column.repository';

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
  ) {}

  /**
   * Возвращает `boardId` ресурса из запроса либо `null`, если маршрут не привязан
   * к конкретной доске (например, список/создание досок). Ресурсы `card`/`comment`/
   * `label` подключаются по мере появления их репозиториев (шаги 2.3–2.5).
   */
  async resolveBoardId(req: BoardRequest): Promise<string | null> {
    const route = normalizeRoutePath(req.route?.path ?? req.path);
    const method = req.method.toUpperCase();

    if (route === '/boards/:id' && BOARD_RESOURCE_METHODS.has(method)) {
      return req.params.id ?? null;
    }

    if (route === '/boards/:boardId/columns' && method === 'POST') {
      return req.params.boardId ?? null;
    }

    if (route === '/columns/:id' && (method === 'PATCH' || method === 'DELETE')) {
      return this.resolveColumnBoard(req.params.id);
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
}
