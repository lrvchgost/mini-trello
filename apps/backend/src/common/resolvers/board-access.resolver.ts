import { Injectable } from '@nestjs/common';
import type { Board } from '@min-trello/shared';
import type { AuthenticatedUser } from '../../auth/auth.types';

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
  /**
   * Возвращает `boardId` ресурса из запроса либо `null`, если маршрут не привязан
   * к конкретной доске (например, список/создание досок). Ресурсы `column`/`card`/
   * `comment`/`label` подключаются по мере появления их репозиториев (шаги 2.2–2.5).
   */
  async resolveBoardId(req: BoardRequest): Promise<string | null> {
    const route = normalizeRoutePath(req.route?.path ?? req.path);
    const method = req.method.toUpperCase();

    if (route === '/boards/:id' && BOARD_RESOURCE_METHODS.has(method)) {
      return req.params.id ?? null;
    }

    return null;
  }
}
