import { SearchIcon, XIcon } from 'lucide-react';
import { PRIORITIES, type Priority } from '@min-trello/shared';
import {
  useFilterValues,
  useFiltersStore,
  hasActiveFilters,
  MAX_QUERY_LENGTH,
} from '@/features/filters';
import { useAssignableUsersQuery } from '@/features/cards';
import { useBoardLabelsQuery } from '@/features/labels';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочный',
};

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60';

interface FilterBarProps {
  /** When set, the label filter and board-scoped search become available. */
  boardId?: string;
  className?: string;
}

export function FilterBar({ boardId, className }: FilterBarProps) {
  const filters = useFilterValues();
  const setQuery = useFiltersStore((state) => state.setQuery);
  const setPriority = useFiltersStore((state) => state.setPriority);
  const setLabelId = useFiltersStore((state) => state.setLabelId);
  const setAssigneeId = useFiltersStore((state) => state.setAssigneeId);
  const setHasDeadline = useFiltersStore((state) => state.setHasDeadline);
  const reset = useFiltersStore((state) => state.reset);

  const labels = useBoardLabelsQuery(boardId ?? '');
  const users = useAssignableUsersQuery();

  const active = hasActiveFilters(filters);

  return (
    <div
      role="group"
      aria-label="Фильтры"
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-muted/30 p-3 lg:flex-row lg:items-end',
        className,
      )}
    >
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="filter-query">Поиск по карточкам</Label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="filter-query"
            value={filters.q}
            maxLength={MAX_QUERY_LENGTH}
            placeholder="Название или описание…"
            className="pr-8 pl-8"
            onChange={(event) => setQuery(event.target.value)}
          />
          {filters.q ? (
            <button
              type="button"
              aria-label="Очистить поиск"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery('')}
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:flex lg:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="filter-priority">Приоритет</Label>
          <select
            id="filter-priority"
            className={selectClassName}
            value={filters.priority ?? ''}
            onChange={(event) => setPriority((event.target.value || null) as Priority | null)}
          >
            <option value="">Все приоритеты</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </div>

        {boardId ? (
          <div className="space-y-1.5">
            <Label htmlFor="filter-label">Метка</Label>
            <select
              id="filter-label"
              className={selectClassName}
              value={filters.labelId ?? ''}
              disabled={labels.isPending}
              onChange={(event) => setLabelId(event.target.value || null)}
            >
              <option value="">Все метки</option>
              {(labels.data ?? []).map((label) => (
                <option key={label.id} value={label.id}>
                  {label.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="filter-assignee">Исполнитель</Label>
          <select
            id="filter-assignee"
            className={selectClassName}
            value={filters.assigneeId ?? ''}
            disabled={users.isPending}
            onChange={(event) => setAssigneeId(event.target.value || null)}
          >
            <option value="">Все исполнители</option>
            {(users.data ?? []).map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-deadline">Дедлайн</Label>
          <select
            id="filter-deadline"
            className={selectClassName}
            value={filters.hasDeadline === null ? '' : String(filters.hasDeadline)}
            onChange={(event) =>
              setHasDeadline(event.target.value === '' ? null : event.target.value === 'true')
            }
          >
            <option value="">Любой дедлайн</option>
            <option value="true">С дедлайном</option>
            <option value="false">Без дедлайна</option>
          </select>
        </div>
      </div>

      {active ? (
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          <XIcon />
          Сбросить
        </Button>
      ) : null}
    </div>
  );
}
