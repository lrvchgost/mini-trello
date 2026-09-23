import { Global, Module } from '@nestjs/common';
import { REFRESH_TOKEN_REPOSITORY_TOKEN } from '../auth/repositories/refresh-token.repository';
import { PrismaRefreshTokenRepository } from '../auth/repositories/prisma-refresh-token.repository';
import { ACTIVITY_REPOSITORY_TOKEN } from '../activity/repositories/activity.repository';
import { PrismaActivityRepository } from '../activity/repositories/prisma-activity.repository';
import { BOARD_REPOSITORY_TOKEN } from '../boards/repositories/board.repository';
import { PrismaBoardRepository } from '../boards/repositories/prisma-board.repository';
import { CARD_REPOSITORY_TOKEN } from '../cards/repositories/card.repository';
import { PrismaCardRepository } from '../cards/repositories/prisma-card.repository';
import { COLUMN_REPOSITORY_TOKEN } from '../columns/repositories/column.repository';
import { PrismaColumnRepository } from '../columns/repositories/prisma-column.repository';
import { COMMENT_REPOSITORY_TOKEN } from '../comments/repositories/comment.repository';
import { PrismaCommentRepository } from '../comments/repositories/prisma-comment.repository';
import { LABEL_REPOSITORY_TOKEN } from '../labels/repositories/label.repository';
import { PrismaLabelRepository } from '../labels/repositories/prisma-label.repository';
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
    { provide: CARD_REPOSITORY_TOKEN, useClass: PrismaCardRepository },
    { provide: LABEL_REPOSITORY_TOKEN, useClass: PrismaLabelRepository },
    { provide: COMMENT_REPOSITORY_TOKEN, useClass: PrismaCommentRepository },
    { provide: ACTIVITY_REPOSITORY_TOKEN, useClass: PrismaActivityRepository },
  ],
  exports: [
    USER_REPOSITORY_TOKEN,
    REFRESH_TOKEN_REPOSITORY_TOKEN,
    BOARD_REPOSITORY_TOKEN,
    COLUMN_REPOSITORY_TOKEN,
    CARD_REPOSITORY_TOKEN,
    LABEL_REPOSITORY_TOKEN,
    COMMENT_REPOSITORY_TOKEN,
    ACTIVITY_REPOSITORY_TOKEN,
  ],
})
export class RepositoriesModule {}
