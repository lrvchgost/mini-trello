import { CalendarClockIcon } from 'lucide-react';
import type { Card, Priority } from '@min-trello/shared';
import { Badge, type BadgeProps } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/utils';

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочный',
};

const PRIORITY_VARIANTS: Record<Priority, BadgeProps['variant']> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive',
};

const deadlineFormatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' });

interface CardItemProps {
  card: Card;
}

export function CardItem({ card }: CardItemProps) {
  const overdue = card.deadline !== null && card.deadline.getTime() < Date.now();

  return (
    <article className="rounded-lg border bg-card p-3 shadow-sm">
      <p className="text-sm font-medium break-words">{card.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant={PRIORITY_VARIANTS[card.priority]}>{PRIORITY_LABELS[card.priority]}</Badge>
        {card.deadline ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs text-muted-foreground',
              overdue && 'text-destructive',
            )}
          >
            <CalendarClockIcon className="size-3" aria-hidden />
            {deadlineFormatter.format(card.deadline)}
          </span>
        ) : null}
      </div>
    </article>
  );
}
