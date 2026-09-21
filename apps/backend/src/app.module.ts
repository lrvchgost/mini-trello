import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HealthModule } from './common/health/health.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { WinstonLogger } from './common/logger/winston.logger';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { AppConfigModule } from './config/config.module';

@Module({
  imports: [AppConfigModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]), HealthModule],
  providers: [
    WinstonLogger,
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
