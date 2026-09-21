import { Global, Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';

/**
 * Единая точка регистрации репозиториев (`*_REPOSITORY_TOKEN`) — @Global,
 * чтобы feature-модули и guard'ы инжектили токены без imports/forwardRef.
 * Биндинги и реализации добавляются по шагам (1.3/1.4/2.x).
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [],
  exports: [],
})
export class RepositoriesModule {}
