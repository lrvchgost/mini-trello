import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/** Id вкладки-инициатора из заголовка `X-Client-Id` (для дедупа WS-событий). */
export const ClientId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const value = request.headers['x-client-id'];
    if (Array.isArray(value)) {
      return value[0] ?? null;
    }
    return value ?? null;
  },
);
