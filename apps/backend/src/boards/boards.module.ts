import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { BoardsController } from './boards.controller';
import { BoardsGateway } from './boards.gateway';
import { BoardsService } from './boards.service';

@Module({
  imports: [ActivityModule],
  controllers: [BoardsController],
  providers: [BoardsService, BoardsGateway],
  exports: [BoardsService, BoardsGateway],
})
export class BoardsModule {}
