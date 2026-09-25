import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { ErrorCode, errorCodeFromStatus } from '../errors';
import { WinstonLogger } from '../logger/winston.logger';

interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

interface DescribedError {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

const DEFAULT_HTTP_ERROR_LABELS = new Set([
  'Bad Request',
  'Unauthorized',
  'Forbidden',
  'Not Found',
  'Method Not Allowed',
  'Conflict',
  'Unprocessable Entity',
  'Too Many Requests',
  'Internal Server Error',
]);

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: WinstonLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, error, message, details } = this.describe(exception);

    const body: ApiErrorBody = {
      statusCode,
      error,
      message,
      ...(details === undefined ? {} : { details }),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${message} (${this.describeCause(exception)})`,
        'ExceptionFilter',
        exception,
      );
    }

    response.status(statusCode).json(body);
  }

  /** Короткая причина для лога: имя и код ошибки (Prisma/PostgreSQL), не теряя стек. */
  private describeCause(exception: unknown): string {
    if (exception instanceof Error) {
      const code = (exception as { code?: unknown }).code;
      return code === undefined ? exception.name : `${exception.name} ${String(code)}`;
    }
    return typeof exception === 'string' ? exception : typeof exception;
  }

  private describe(exception: unknown): DescribedError {
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        error: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: zodError instanceof ZodError ? zodError.issues : zodError,
      };
    }

    if (exception instanceof HttpException) {
      return this.describeHttpException(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    };
  }

  private describeHttpException(exception: HttpException): DescribedError {
    const statusCode = exception.getStatus();
    const payload = exception.getResponse();

    let error = errorCodeFromStatus(statusCode);
    let message = exception.message;
    let details: unknown;

    if (typeof payload === 'string') {
      message = payload;
    } else if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;

      if (typeof record.error === 'string' && !DEFAULT_HTTP_ERROR_LABELS.has(record.error)) {
        error = record.error;
      }

      if (Array.isArray(record.message)) {
        message = record.message.join('; ');
      } else if (typeof record.message === 'string') {
        message = record.message;
      }

      if ('details' in record) {
        details = record.details;
      }
    }

    return { statusCode, error, message, details };
  }
}
