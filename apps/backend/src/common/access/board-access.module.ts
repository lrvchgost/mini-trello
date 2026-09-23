import { Global, Module } from '@nestjs/common';
import { BoardAccessGuard } from '../guards/board-access.guard';
import { BoardAccessResolver } from '../resolvers/board-access.resolver';

@Global()
@Module({
  providers: [BoardAccessResolver, BoardAccessGuard],
  exports: [BoardAccessResolver, BoardAccessGuard],
})
export class BoardAccessModule {}
