import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import type { AccessTokenPayload, AuthenticatedUser } from '../auth/auth.types';

export type WsNext = (err?: Error) => void;

export interface WsSocketData {
  user?: AuthenticatedUser;
  clientId?: string;
}

/**
 * Валидирует access-токен из `handshake.auth.token`, кладёт пользователя в
 * `socket.data.user`. Middleware глобальна для namespace, поэтому применяется
 * на io-сервере ровно один раз (даже если gateway несколько).
 */
@Injectable()
export class WsAuthMiddleware {
  private readonly logger = new Logger(WsAuthMiddleware.name);
  private readonly applied = new WeakSet<Server>();

  constructor(private readonly jwtService: JwtService) {}

  apply(server: Server): void {
    if (this.applied.has(server)) {
      return;
    }
    this.applied.add(server);
    server.use((socket, next) => this.authenticate(socket, next));
  }

  authenticate(socket: Socket, next: WsNext): void {
    const token = readToken(socket);
    if (!token) {
      next(new Error('UNAUTHORIZED'));
      return;
    }
    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token);
      (socket.data as WsSocketData).user = { id: payload.sub, email: payload.email };
      next();
    } catch {
      this.logger.debug(`Rejected socket ${socket.id}: invalid token`);
      next(new Error('UNAUTHORIZED'));
    }
  }
}

function readToken(socket: Socket): string | null {
  const auth = socket.handshake.auth as { token?: unknown } | undefined;
  const token = auth?.token;
  return typeof token === 'string' && token.length > 0 ? token : null;
}
