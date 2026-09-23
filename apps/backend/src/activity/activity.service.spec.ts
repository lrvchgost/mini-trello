import { firstValueFrom, take } from 'rxjs';
import type { ActivityLog } from '@min-trello/shared';
import type { RedisService } from '../redis/redis.service';
import { ActivityService } from './activity.service';
import type { IActivityRepository } from './repositories/activity.repository';

const entry: ActivityLog = {
  id: 'activity-1',
  action: 'card.created',
  payload: { cardId: 'card-1' },
  boardId: 'board-1',
  cardId: 'card-1',
  userId: 'user-1',
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
};

type PmessageHandler = (pattern: string, channel: string, message: string) => void;

describe('ActivityService', () => {
  let service: ActivityService;
  let activityRepo: jest.Mocked<IActivityRepository>;
  let publisher: { publish: jest.Mock };
  let subscriber: { on: jest.Mock; psubscribe: jest.Mock };

  beforeEach(() => {
    activityRepo = {
      create: jest.fn(),
      findByBoard: jest.fn(),
    };

    publisher = { publish: jest.fn().mockResolvedValue(1) };
    subscriber = { on: jest.fn(), psubscribe: jest.fn().mockResolvedValue(1) };

    service = new ActivityService(activityRepo, {
      publisher,
      subscriber,
    } as unknown as RedisService);
  });

  it('persists the activity and publishes it to the board channel', async () => {
    activityRepo.create.mockResolvedValue(entry);

    await expect(
      service.log('board-1', 'card.created', { cardId: 'card-1' }, 'user-1', 'card-1'),
    ).resolves.toBe(entry);

    expect(activityRepo.create).toHaveBeenCalledWith({
      boardId: 'board-1',
      action: 'card.created',
      payload: { cardId: 'card-1' },
      userId: 'user-1',
      cardId: 'card-1',
    });
    expect(publisher.publish).toHaveBeenCalledWith('board:board-1:activity', JSON.stringify(entry));
  });

  it('subscribes to all board activity channels on init', async () => {
    await service.onModuleInit();

    expect(subscriber.psubscribe).toHaveBeenCalledWith('board:*:activity');
    expect(subscriber.on).toHaveBeenCalledWith('pmessage', expect.any(Function));
  });

  it('fans out published messages to local stream subscribers', async () => {
    let handler: PmessageHandler = () => undefined;
    subscriber.on.mockImplementation((_event: string, callback: PmessageHandler) => {
      handler = callback;
      return subscriber;
    });

    await service.onModuleInit();

    const received = firstValueFrom(service.stream('board-1').pipe(take(1)));
    handler('board:*:activity', 'board:board-1:activity', JSON.stringify(entry));

    await expect(received).resolves.toEqual({
      type: 'activity',
      data: JSON.parse(JSON.stringify(entry)),
    });
  });

  it('ignores messages for boards without local subscribers', async () => {
    let handler: PmessageHandler = () => undefined;
    subscriber.on.mockImplementation((_event: string, callback: PmessageHandler) => {
      handler = callback;
      return subscriber;
    });

    await service.onModuleInit();

    expect(() =>
      handler('board:*:activity', 'board:board-2:activity', JSON.stringify(entry)),
    ).not.toThrow();
  });

  it('lists board activity via the repository', async () => {
    const paginated = { items: [entry], total: 1, page: 1, limit: 20 };
    activityRepo.findByBoard.mockResolvedValue(paginated);

    await expect(service.list('board-1', 1, 20)).resolves.toBe(paginated);
    expect(activityRepo.findByBoard).toHaveBeenCalledWith('board-1', 1, 20);
  });
});
