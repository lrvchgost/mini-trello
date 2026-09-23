import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { ArrowLeftIcon, LayoutGridIcon, PanelRightIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@min-trello/shared';
import { useBoardQuery } from '@/entities/board';
import { AddColumnForm } from '@/features/boards';
import { useMoveCard } from '@/features/cards';
import {
  buildSearchQuery,
  filtersToSearchParams,
  hasActiveFilters,
  SearchResults,
  useBoardSearchQuery,
  useFiltersUrlSync,
  useFilterValues,
  type FilterValues,
} from '@/features/filters';
import { useBoardLive } from '@/features/live';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { extractApiError } from '@/shared/lib/errors';
import { byOrder } from '@/shared/lib/order';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Loading } from '@/shared/ui/loading';
import { ActivityPanel } from '@/widgets/activity-log';
import { BoardColumn } from '@/widgets/board-column';
import { FilterBar } from '@/widgets/filter-bar';

const DEBOUNCE_MS = 300;

export function BoardPage() {
  useFiltersUrlSync();

  const { id } = useParams<{ id: string }>();
  const { data, isPending, isError, error } = useBoardQuery(id);
  useBoardLive(id);
  const columns = useMemo(() => [...(data?.columns ?? [])].sort(byOrder), [data]);
  const moveCard = useMoveCard(id ?? '');

  const filters = useFilterValues();
  const debouncedQ = useDebouncedValue(filters.q, DEBOUNCE_MS);
  const effective: FilterValues = { ...filters, q: debouncedQ };
  const filtering = hasActiveFilters(effective);

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [activityOpen, setActivityOpen] = useState(false);
  const filterKey = filtersToSearchParams(filters).toString();

  useEffect(() => {
    setPage(DEFAULT_PAGE);
  }, [filterKey]);

  const search = useBoardSearchQuery(id ?? '', buildSearchQuery(effective, page), filtering);

  const notFound = isError && extractApiError(error).status === 404;

  function handleDragEnd(result: DropResult) {
    const { draggableId, source, destination } = result;
    if (!id || !destination) {
      return;
    }
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }
    moveCard.mutate({
      id: draggableId,
      input: { columnId: destination.droppableId, order: destination.index },
    });
  }

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
            <p className="text-sm text-muted-foreground">
              {filtering ? 'Результаты фильтрации' : `Колонок: ${columns.length}`}
            </p>
          </div>
        ) : null}
        {data ? (
          <Button
            type="button"
            variant={activityOpen ? 'secondary' : 'outline'}
            size="sm"
            className="ml-auto"
            aria-pressed={activityOpen}
            onClick={() => setActivityOpen((value) => !value)}
          >
            <PanelRightIcon />
            Активность
          </Button>
        ) : null}
      </div>

      <div className="flex items-start">
        <div className="min-w-0 flex-1 space-y-6">
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

          {data ? <FilterBar boardId={id} /> : null}

          {data && filtering ? (
            <SearchResults
              data={search.data}
              isPending={search.isPending}
              isError={search.isError}
              page={page}
              limit={DEFAULT_LIMIT}
              onPageChange={setPage}
              boardId={id}
            />
          ) : null}

          {data && !filtering ? (
            <>
              {moveCard.isError ? (
                <p role="alert" className="text-sm text-destructive">
                  Не удалось переместить карточку. Изменения отменены.
                </p>
              ) : null}

              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex items-start gap-4 overflow-x-auto pb-2">
                  {columns.map((column) => (
                    <BoardColumn key={column.id} column={column} />
                  ))}
                  {columns.length === 0 ? (
                    <p className="w-72 shrink-0 self-center rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                      Колонок пока нет. Создайте первую — карточки добавите внутри.
                    </p>
                  ) : null}
                  {id ? <AddColumnForm boardId={id} /> : null}
                </div>
              </DragDropContext>
            </>
          ) : null}
        </div>

        {data ? <ActivityPanel boardId={data.id} open={activityOpen} /> : null}
      </div>

      <Outlet />
    </div>
  );
}
