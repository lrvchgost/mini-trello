import { HistoryIcon } from 'lucide-react';
import { activityPageSize, useActivityQuery } from '@/entities/activity';
import { useActivityLive, type ActivityStreamStatus } from '@/features/live';
import { cn } from '@/shared/lib/utils';
import { EmptyState } from '@/shared/ui/empty-state';
import { Loading } from '@/shared/ui/loading';
import { describeActivity, formatActivityTime } from './activity-format';

interface ActivityLogProps {
  boardId: string;
  className?: string;
}

const STATUS_LABEL: Record<ActivityStreamStatus, string> = {
  open: 'в эфире',
  connecting: 'подключение…',
  error: 'нет связи',
};

const STATUS_DOT: Record<ActivityStreamStatus, string> = {
  open: 'bg-emerald-500',
  connecting: 'bg-amber-500',
  error: 'bg-destructive',
};

export function ActivityLog({ boardId, className }: ActivityLogProps) {
  const { data, isPending, isError } = useActivityQuery(boardId, {
    page: 1,
    limit: activityPageSize,
  });
  const status = useActivityLive(boardId);
  const items = data?.items ?? [];

  return (
    <div
      className={cn(
        'flex max-h-[28rem] flex-col rounded-xl border bg-card text-card-foreground shadow-sm',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <HistoryIcon className="size-4" aria-hidden />
          Активность
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn('size-2 rounded-full', STATUS_DOT[status])} aria-hidden />
          {STATUS_LABEL[status]}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isPending ? <Loading label="Загружаем активность…" /> : null}

        {isError ? (
          <p role="alert" className="text-sm text-destructive">
            Не удалось загрузить активность.
          </p>
        ) : null}

        {!isPending && !isError && items.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon />}
            title="Пока пусто"
            description="Здесь появятся действия по доске."
          />
        ) : null}

        {items.length > 0 ? (
          <ol className="space-y-3">
            {items.map((activity) => (
              <li key={activity.id} className="text-sm">
                <p>{describeActivity(activity)}</p>
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={activity.createdAt.toISOString()}
                >
                  {formatActivityTime(activity.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
