import { DragDropContext } from '@hello-pangea/dnd';
import { ArrowLeftIcon, LayoutGridIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBoardQuery } from '@/entities/board';
import { extractApiError } from '@/shared/lib/errors';
import { byOrder } from '@/shared/lib/order';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Loading } from '@/shared/ui/loading';
import { BoardColumn } from '@/widgets/board-column';

export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, isError, error } = useBoardQuery(id);
  const columns = useMemo(() => [...(data?.columns ?? [])].sort(byOrder), [data]);

  const notFound = isError && extractApiError(error).status === 404;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard">
            <ArrowLeftIcon />К доскам
          </Link>
        </Button>
        {data ? (
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{data.title}</h1>
            <p className="text-sm text-muted-foreground">Колонок: {columns.length}</p>
          </div>
        ) : null}
      </div>

      {isPending ? <Loading label="Загружаем доску…" /> : null}

      {notFound ? (
        <EmptyState
          icon={<LayoutGridIcon />}
          title="Доска не найдена"
          description="Возможно, доска удалена или у вас нет к ней доступа."
          action={
            <Button asChild>
              <Link to="/dashboard">К списку досок</Link>
            </Button>
          }
        />
      ) : null}

      {isError && !notFound ? (
        <p role="alert" className="text-sm text-destructive">
          Не удалось загрузить доску.
        </p>
      ) : null}

      {data && columns.length === 0 ? (
        <EmptyState
          icon={<LayoutGridIcon />}
          title="В доске нет колонок"
          description="Колонки появятся здесь, когда будут созданы."
        />
      ) : null}

      {data && columns.length > 0 ? (
        <DragDropContext onDragEnd={() => undefined}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {columns.map((column) => (
              <BoardColumn key={column.id} column={column} />
            ))}
          </div>
        </DragDropContext>
      ) : null}
    </div>
  );
}
