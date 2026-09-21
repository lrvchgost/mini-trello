import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { REFRESH_COOKIE_NAME } from './auth/auth.constants';
import { APP_ENV, type AppEnv } from './config/env';

export function configureApp(app: INestApplication): void {
  const env = app.get<AppEnv>(APP_ENV);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: env.CORS_ORIGIN, credentials: true });

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Min-Trello API')
      .setDescription('Kanban board API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth(REFRESH_COOKIE_NAME)
      .build(),
  );

  SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(document));
}
