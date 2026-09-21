import { Test } from '@nestjs/testing';
import {
  BOARD_REPOSITORY_TOKEN,
  type IBoardRepository,
} from '../boards/repositories/board.repository';

describe('Repository DI (no Prisma required)', () => {
  it('replaces a repository token with a mock', async () => {
    const mock: jest.Mocked<IBoardRepository> = {
      findById: jest.fn(),
      findByOwner: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [{ provide: BOARD_REPOSITORY_TOKEN, useValue: mock }],
    }).compile();

    expect(moduleRef.get(BOARD_REPOSITORY_TOKEN)).toBe(mock);
  });
});
