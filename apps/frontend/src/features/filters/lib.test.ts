import { describe, expect, it } from 'vitest';
import {
  buildSearchQuery,
  emptyFilters,
  filtersEqual,
  filtersFromSearchParams,
  filtersToSearchParams,
  hasActiveFilters,
  type FilterValues,
} from './lib';

const filters: FilterValues = {
  q: 'login',
  priority: 'high',
  labelId: 'label1',
  assigneeId: 'user1',
  hasDeadline: true,
};

describe('filters lib', () => {
  it('serializes active filters', () => {
    const params = filtersToSearchParams(filters);
    expect(params.get('q')).toBe('login');
    expect(params.get('priority')).toBe('high');
    expect(params.get('label')).toBe('label1');
    expect(params.get('assignee')).toBe('user1');
    expect(params.get('hasDeadline')).toBe('true');
  });

  it('trims the query', () => {
    expect(filtersToSearchParams({ ...emptyFilters, q: '  spaced  ' }).get('q')).toBe('spaced');
  });

  it('omits empty filters', () => {
    expect(filtersToSearchParams(emptyFilters).toString()).toBe('');
  });

  it('parses filters from the URL, ignoring invalid values', () => {
    const params = new URLSearchParams(
      'q=fix&priority=bogus&label=l1&assignee=u1&hasDeadline=false',
    );
    expect(filtersFromSearchParams(params)).toEqual({
      q: 'fix',
      priority: null,
      labelId: 'l1',
      assigneeId: 'u1',
      hasDeadline: false,
    });
  });

  it('round-trips filters through the URL', () => {
    const restored = filtersFromSearchParams(filtersToSearchParams(filters));
    expect(filtersEqual(restored, filters)).toBe(true);
  });

  it('detects active filters', () => {
    expect(hasActiveFilters(emptyFilters)).toBe(false);
    expect(hasActiveFilters({ ...emptyFilters, q: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...emptyFilters, hasDeadline: false })).toBe(true);
    expect(hasActiveFilters({ ...emptyFilters, priority: 'urgent' })).toBe(true);
  });

  it('builds a search query without empty keys', () => {
    expect(buildSearchQuery(emptyFilters, 2)).toEqual({ page: 2, limit: 20 });
    expect(buildSearchQuery(filters, 1)).toEqual({
      page: 1,
      limit: 20,
      q: 'login',
      priority: 'high',
      label: 'label1',
      assignee: 'user1',
      hasDeadline: true,
    });
  });
});
