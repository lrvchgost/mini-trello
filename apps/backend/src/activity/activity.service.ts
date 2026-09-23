import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Subject, interval, merge, type Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import type { ActivityAction, ActivityLog, Paginated } from '@min-trello/shared';
import { RedisService } from '../redis/redis.service';
import {
  ACTIVITY_REPOSITORY_TOKEN,
  type IActivityRepository,
} from './repositories/activity.repository';

export interface ActivityStreamEvent {
  type: 'activity' | 'ping';
  data: unknown;
}

const CHANNEL_PREFIX = 'board:';
const CHANNEL_SUFFIX = ':activity';
const CHANNEL_PATTERN = `${CHANNEL_PREFIX}*${CHANNEL_SUFFIX}`;
const PING_INTERVAL_MS = 15_000;

interface BoardStream {
  subject: Subject<ActivityLog>;
  subscribers: number;
}

function activityChannel(boardId: string): string {
  return `${CHANNEL_PREFIX}${boardId}${CHANNEL_SUFFIX}`;
}

function boardIdFromChannel(channel: string): string | null {
  if (!channel.startsWith(CHANNEL_PREFIX) || !channel.endsWith(CHANNEL_SUFFIX)) {
    return null;
  }
  return channel.slice(CHANNEL_PREFIX.length, channel.length - CHANNEL_SUFFIX.length);
}

@Injectable()
export class ActivityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActivityService.name);
  private readonly streams = new Map<string, BoardStream>();

  constructor(
    @Inject(ACTIVITY_REPOSITORY_TOKEN)
    private readonly activityRepo: IActivityRepository,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.redis.subscriber.on('pmessage', (_pattern, channel, message) => {
      this.handleMessage(channel, message);
    });
    await this.redis.subscriber.psubscribe(CHANNEL_PATTERN);
  }

  onModuleDestroy(): void {
    for (const stream of this.streams.values()) {
      stream.subject.complete();
    }
    this.streams.clear();
  }

  /**
   * Пишет запись в БД и публикует её в Redis Pub/Sub. Локально не эмитит: событие
   * придёт всем инстансам (включая текущий) через подписку, что исключает дубль.
   */
  async log(
    boardId: string,
    action: ActivityAction,
    payload: Record<string, unknown>,
    actorId: string,
    cardId?: string | null,
  ): Promise<ActivityLog> {
    const activity = await this.activityRepo.create({
      boardId,
      action,
      payload,
      userId: actorId,
      cardId,
    });
    await this.redis.publisher.publish(activityChannel(boardId), JSON.stringify(activity));
    return activity;
  }

  list(boardId: string, page: number, limit: number): Promise<Paginated<ActivityLog>> {
    return this.activityRepo.findByBoard(boardId, page, limit);
  }

  stream(boardId: string): Observable<ActivityStreamEvent> {
    const subject = this.acquire(boardId);

    const activity$ = subject.pipe(
      map((activity): ActivityStreamEvent => ({ type: 'activity', data: activity })),
    );
    const ping$ = interval(PING_INTERVAL_MS).pipe(
      map((): ActivityStreamEvent => ({
        type: 'ping',
        data: { timestamp: new Date().toISOString() },
      })),
    );

    return merge(activity$, ping$).pipe(finalize(() => this.release(boardId)));
  }

  private acquire(boardId: string): Subject<ActivityLog> {
    let stream = this.streams.get(boardId);
    if (!stream) {
      stream = { subject: new Subject<ActivityLog>(), subscribers: 0 };
      this.streams.set(boardId, stream);
    }
    stream.subscribers += 1;
    return stream.subject;
  }

  private release(boardId: string): void {
    const stream = this.streams.get(boardId);
    if (!stream) {
      return;
    }
    stream.subscribers -= 1;
    if (stream.subscribers <= 0) {
      stream.subject.complete();
      this.streams.delete(boardId);
    }
  }

  private handleMessage(channel: string, message: string): void {
    const boardId = boardIdFromChannel(channel);
    const stream = boardId ? this.streams.get(boardId) : undefined;
    if (!stream) {
      return;
    }
    try {
      stream.subject.next(JSON.parse(message) as ActivityLog);
    } catch {
      this.logger.warn(`Discarded malformed activity payload on ${channel}`);
    }
  }
}
