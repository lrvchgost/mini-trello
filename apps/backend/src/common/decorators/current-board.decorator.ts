import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Board } from '@min-trello/shared';

/** Доска, проверенная `BoardAccessGuard` и сохранённая в `req.board`. */
export const CurrentBoard = createParamDecorator((_data: unknown, ctx: ExecutionContext): Board => {
  const request = ctx.switchToHttp().getRequest<{ board?: Board }>();
  return request.board as Board;
});
