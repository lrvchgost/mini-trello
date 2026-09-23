import { ChevronLeftIcon, ChevronRightIcon, LayoutGridIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { BoardListItem } from '@min-trello/shared';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' });

interface BoardListProps {
  boards: BoardListItem[];
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function BoardList({ boards, page, limit, total, onPageChange }: BoardListProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <li key={board.id}>
            <Link
              to={`/boards/${board.id}`}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Card className="h-full transition-colors hover:border-ring">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="truncate">{board.title}</span>
                    <Badge
                      variant="secondary"
                      aria-label={`Карточек на доске: ${board.cardsCount}`}
                    >
                      <LayoutGridIcon className="size-3" />
                      {board.cardsCount}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Создана {dateFormatter.format(new Date(board.createdAt))}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      {totalPages > 1 ? (
        <nav
          aria-label="Пагинация досок"
          className="flex items-center justify-between gap-4 text-sm"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon />
            Назад
          </Button>
          <span className="text-muted-foreground">
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
