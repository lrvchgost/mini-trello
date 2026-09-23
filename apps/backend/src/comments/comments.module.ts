import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { CardsModule } from '../cards/cards.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [ActivityModule, CardsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
