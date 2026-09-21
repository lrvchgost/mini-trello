import { HealthCheckError } from '@nestjs/terminus';
import type { PrismaService } from '../../prisma/prisma.service';
import { PrismaHealthIndicator } from './prisma-health.indicator';

describe('PrismaHealthIndicator (DI with a mocked PrismaService)', () => {
  it('reports up when the database answers', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;

    const indicator = new PrismaHealthIndicator(prisma);

    await expect(indicator.isHealthy('db')).resolves.toEqual({ db: { status: 'up' } });
  });

  it('throws HealthCheckError when the database is unavailable', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as PrismaService;

    const indicator = new PrismaHealthIndicator(prisma);

    await expect(indicator.isHealthy('db')).rejects.toBeInstanceOf(HealthCheckError);
  });
});
