import { CallHandler, ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap } from 'rxjs';
import { WinstonLogger } from '../logger/winston.logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: WinstonLogger) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();
    const label = `${request.method} ${request.originalUrl}`;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(`${label} ${response.statusCode} ${Date.now() - startedAt}ms`, 'HTTP');
        },
        error: (error: unknown) => {
          this.logger.warn(`${label} failed after ${Date.now() - startedAt}ms`, 'HTTP', error);
        },
      }),
    );
  }
}
