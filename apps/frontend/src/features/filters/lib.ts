import { DEFAULT_LIMIT, PRIORITIES, type Priority, type SearchQuery } from '@min-trello/shared';

export interface FilterValues {
  q: string;
  priority: Priority | null;
  labelId: string | null;
  assigneeId: string | null;
  hasDeadline: boolean | null;
}

export const emptyFilters: FilterValues = {
  q: '',
  priority: null,
  labelId: null,
  assigneeId: null,
  hasDeadline: null,
};

const PARAM = {
  q: 'q',
  priority: 'priority',
  label: 'label',
  assignee: 'assignee',
  hasDeadline: 'hasDeadline',
} as const;

export const MAX_QUERY_LENGTH = 200;

function isPriority(value: string | null): value is Priority {
  return value !== null && (PRIORITIES as readonly string[]).includes(value);
}

export function filtersToSearchParams(filters: FilterValues): URLSearchParams {
  const params = new URLSearchParams();
  const query = filters.q.trim().slice(0, MAX_QUERY_LENGTH);
  if (query) {
    params.set(PARAM.q, query);
  }
  if (filters.priority) {
    params.set(PARAM.priority, filters.priority);
  }
  if (filters.labelId) {
    params.set(PARAM.label, filters.labelId);
  }
  if (filters.assigneeId) {
    params.set(PARAM.assignee, filters.assigneeId);
  }
  if (filters.hasDeadline !== null) {
    params.set(PARAM.hasDeadline, String(filters.hasDeadline));
  }
  return params;
}

export function filtersFromSearchParams(params: URLSearchParams): FilterValues {
  const priority = params.get(PARAM.priority);
  const hasDeadline = params.get(PARAM.hasDeadline);
  return {
    q: params.get(PARAM.q)?.slice(0, MAX_QUERY_LENGTH) ?? '',
    priority: isPriority(priority) ? priority : null,
    labelId: params.get(PARAM.label),
    assigneeId: params.get(PARAM.assignee),
    hasDeadline: hasDeadline === 'true' ? true : hasDeadline === 'false' ? false : null,
  };
}

export function hasActiveFilters(filters: FilterValues): boolean {
  return (
    filters.q.trim().length > 0 ||
    filters.priority !== null ||
    filters.labelId !== null ||
    filters.assigneeId !== null ||
    filters.hasDeadline !== null
  );
}

export function filtersEqual(a: FilterValues, b: FilterValues): boolean {
  return (
    a.q === b.q &&
    a.priority === b.priority &&
    a.labelId === b.labelId &&
    a.assigneeId === b.assigneeId &&
    a.hasDeadline === b.hasDeadline
  );
}

export function buildSearchQuery(
  filters: FilterValues,
  page: number,
  limit: number = DEFAULT_LIMIT,
): SearchQuery {
  const query = filters.q.trim();
  return {
    page,
    limit,
    ...(query ? { q: query } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.labelId ? { label: filters.labelId } : {}),
    ...(filters.assigneeId ? { assignee: filters.assigneeId } : {}),
    ...(filters.hasDeadline !== null ? { hasDeadline: filters.hasDeadline } : {}),
  };
}
