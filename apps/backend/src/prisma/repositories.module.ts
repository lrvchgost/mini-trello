import { Global, Module } from '@nestjs/common';
import { REFRESH_TOKEN_REPOSITORY_TOKEN } from '../auth/repositories/refresh-token.repository';
import { PrismaRefreshTokenRepository } from '../auth/repositories/prisma-refresh-token.repository';
import { BOARD_REPOSITORY_TOKEN } from '../boards/repositories/board.repository';
import { PrismaBoardRepository } from '../boards/repositories/prisma-board.repository';
import { COLUMN_REPOSITORY_TOKEN } from '../columns/repositories/column.repository';
import { PrismaColumnRepository } from '../columns/repositories/prisma-column.repository';
import { USER_REPOSITORY_TOKEN } from '../users/repositories/user.repository';
import { PrismaUserRepository } from '../users/repositories/prisma-user.repository';
import { PrismaModule } from './prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    { provide: USER_REPOSITORY_TOKEN, useClass: PrismaUserRepository },
    { provide: REFRESH_TOKEN_REPOSITORY_TOKEN, useClass: PrismaRefreshTokenRepository },
    { provide: BOARD_REPOSITORY_TOKEN, useClass: PrismaBoardRepository },
    { provide: COLUMN_REPOSITORY_TOKEN, useClass: PrismaColumnRepository },
  ],
  exports: [
    USER_REPOSITORY_TOKEN,
    REFRESH_TOKEN_REPOSITORY_TOKEN,
    BOARD_REPOSITORY_TOKEN,
    COLUMN_REPOSITORY_TOKEN,
  ],
})
export class RepositoriesModule {}
