import { useState } from 'react';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@min-trello/shared';
import { LayoutGridIcon } from 'lucide-react';
import { BoardList } from '@/features/boards/board-list';
import { CreateBoardDialog } from '@/features/boards/create-board-dialog';
import { useBoardsQuery } from '@/features/boards/hooks';
import { EmptyState } from '@/shared/ui/empty-state';
import { Loading } from '@/shared/ui/loading';
import { StatsOverview } from '@/widgets/stats-chart';

export function DashboardPage() {
  const [page, setPage] = useState(DEFAULT_PAGE);
  const { data, isPending, isError } = useBoardsQuery({ page, limit: DEFAULT_LIMIT });

  const boards = data?.items ?? [];
  const total = data?.total ?? 0;
  const isEmpty = !isPending && !isError && boards.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
          <p className="text-sm text-muted-foreground">
            Статистика по вашим доскам и список досок.
          </p>
        </div>
        <CreateBoardDialog />
      </div>

      <StatsOverview />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Мои доски</h2>

        {isPending ? <Loading label="Загружаем доски…" /> : null}

        {isError ? (
          <p role="alert" className="text-sm text-destructive">
            Не удалось загрузить доски.
          </p>
        ) : null}

        {isEmpty ? (
          <EmptyState
            icon={<LayoutGridIcon />}
            title="Досок пока нет"
            description="Создайте первую доску, чтобы начать работу."
            action={<CreateBoardDialog />}
          />
        ) : null}

        {!isPending && !isError && boards.length > 0 ? (
          <BoardList
            boards={boards}
            page={page}
            limit={DEFAULT_LIMIT}
            total={total}
            onPageChange={setPage}
          />
        ) : null}
      </section>
    </div>
  );
}
