import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_ENV, type AppEnv } from '../config/env';
import { WsAuthMiddleware } from './ws-auth.middleware';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [APP_ENV],
      useFactory: (env: AppEnv) => ({ secret: env.JWT_SECRET }),
    }),
  ],
  providers: [WsAuthMiddleware],
  exports: [WsAuthMiddleware],
})
export class RealtimeModule {}
