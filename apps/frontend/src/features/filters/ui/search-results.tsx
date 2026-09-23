import { ChevronLeftIcon, ChevronRightIcon, SearchXIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Card, Paginated, Priority } from '@min-trello/shared';
import { Badge, type BadgeProps } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Loading } from '@/shared/ui/loading';
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

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' });

function excerpt(description: string | null): string | null {
  if (!description) {
    return null;
  }
  const text = description
    .replace(/[#*_`>[\]()!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 0 ? text.slice(0, 160) : null;
}

interface SearchResultItemProps {
  card: Card;
  boardId?: string;
}

function SearchResultItem({ card, boardId }: SearchResultItemProps) {
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  const preview = excerpt(card.description);
  const overdue = card.deadline !== null && card.deadline.getTime() < Date.now();

  const body = (
    <article className="rounded-lg border bg-card p-4 shadow-sm transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium break-words">{card.title}</p>
        <Badge variant={PRIORITY_VARIANTS[card.priority]}>{PRIORITY_LABELS[card.priority]}</Badge>
      </div>
      {preview ? <p className="mt-1 text-xs text-muted-foreground">{preview}</p> : null}
      {card.deadline ? (
        <p className={cn('mt-2 text-xs text-muted-foreground', overdue && 'text-destructive')}>
          Дедлайн: {dateFormatter.format(card.deadline)}
        </p>
      ) : null}
    </article>
  );

  if (!boardId) {
    return <li>{body}</li>;
  }

  const path = search ? `cards/${card.id}?${search}` : `cards/${card.id}`;
  return (
    <li>
      <Link
        to={path}
        className="block rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {body}
      </Link>
    </li>
  );
}

interface SearchResultsProps {
  data: Paginated<Card> | undefined;
  isPending: boolean;
  isError: boolean;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  /** When set, results open the card modal of that board. */
  boardId?: string;
}

export function SearchResults({
  data,
  isPending,
  isError,
  page,
  limit,
  onPageChange,
  boardId,
}: SearchResultsProps) {
  if (isPending) {
    return <Loading label="Ищем карточки…" />;
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Не удалось выполнить поиск.
      </p>
    );
  }

  const cards = data?.items ?? [];
  const total = data?.total ?? 0;

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={<SearchXIcon />}
        title="Ничего не найдено"
        description="Попробуйте изменить фильтры или поисковый запрос."
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Найдено карточек: {total}</p>

      <ul className="space-y-2">
        {cards.map((card) => (
          <SearchResultItem key={card.id} card={card} boardId={boardId} />
        ))}
      </ul>

      {totalPages > 1 ? (
        <nav aria-label="Пагинация результатов" className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon />
            Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            Страница {page} из {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Вперёд
            <ChevronRightIcon />
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
