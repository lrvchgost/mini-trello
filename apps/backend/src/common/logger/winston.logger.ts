import { Injectable, type LoggerService } from '@nestjs/common';
import { createLogger, format, transports, type Logger } from 'winston';

@Injectable()
export class WinstonLogger implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    this.logger = createLogger({
      level: process.env.LOG_LEVEL ?? 'info',
      format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
      transports: [new transports.Console()],
    });
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  private write(level: string, message: unknown, optionalParams: unknown[]): void {
    const context = optionalParams.find((param): param is string => typeof param === 'string');
    const error = optionalParams.find((param): param is Error => param instanceof Error);
    const stack = error?.stack ?? (message instanceof Error ? message.stack : undefined);
    this.logger.log(level, this.normalize(message), {
      ...(context ? { context } : {}),
      ...(stack ? { stack } : {}),
    });
  }

  private normalize(message: unknown): string {
    if (typeof message === 'string') return message;
    if (message instanceof Error) return message.stack ?? message.message;
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
