import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { CardsController } from './cards.controller';
import { CardsGateway } from './cards.gateway';
import { CardsService } from './cards.service';

@Module({
  imports: [ActivityModule],
  controllers: [CardsController],
  providers: [CardsService, CardsGateway],
  exports: [CardsService, CardsGateway],
})
export class CardsModule {}
