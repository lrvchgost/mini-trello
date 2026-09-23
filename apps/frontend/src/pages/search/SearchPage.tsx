import { useEffect, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@min-trello/shared';
import {
  buildSearchQuery,
  filtersToSearchParams,
  hasActiveFilters,
  useFilterValues,
  useFiltersUrlSync,
  useGlobalSearchQuery,
  SearchResults,
  type FilterValues,
} from '@/features/filters';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { EmptyState } from '@/shared/ui/empty-state';
import { FilterBar } from '@/widgets/filter-bar';

const DEBOUNCE_MS = 300;

export function SearchPage() {
  useFiltersUrlSync();

  const filters = useFilterValues();
  const debouncedQ = useDebouncedValue(filters.q, DEBOUNCE_MS);
  const effective: FilterValues = { ...filters, q: debouncedQ };

  const [page, setPage] = useState(DEFAULT_PAGE);
  const filterKey = filtersToSearchParams(filters).toString();

  useEffect(() => {
    setPage(DEFAULT_PAGE);
  }, [filterKey]);

  const active = hasActiveFilters(effective);
  const query = buildSearchQuery(effective, page, DEFAULT_LIMIT);
  const { data, isPending, isError } = useGlobalSearchQuery(query, active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Поиск</h1>
        <p className="text-sm text-muted-foreground">
          Глобальный поиск по карточкам всех ваших досок.
        </p>
      </div>

      <FilterBar />

      {active ? (
        <SearchResults
          data={data}
          isPending={isPending}
          isError={isError}
          page={page}
          limit={DEFAULT_LIMIT}
          onPageChange={setPage}
        />
      ) : (
        <EmptyState
          icon={<SearchIcon />}
          title="Введите запрос"
          description="Укажите текст или выберите фильтры, чтобы найти карточки."
        />
      )}
    </div>
  );
}
