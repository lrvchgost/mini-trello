import { beforeEach, describe, expect, it } from 'vitest';
import { selectFilterValues, useFiltersStore } from './store';

describe('filters store', () => {
  beforeEach(() => {
    useFiltersStore.getState().reset();
  });

  it('starts empty', () => {
    expect(selectFilterValues(useFiltersStore.getState())).toEqual({
      q: '',
      priority: null,
      labelId: null,
      assigneeId: null,
      hasDeadline: null,
    });
  });

  it('updates individual filters', () => {
    const state = useFiltersStore.getState();
    state.setQuery('login');
    state.setPriority('high');
    state.setLabelId('label1');
    state.setAssigneeId('user1');
    state.setHasDeadline(false);

    expect(selectFilterValues(useFiltersStore.getState())).toEqual({
      q: 'login',
      priority: 'high',
      labelId: 'label1',
      assigneeId: 'user1',
      hasDeadline: false,
    });
  });

  it('replaces all filters and resets', () => {
    useFiltersStore.getState().setAll({
      q: 'x',
      priority: 'low',
      labelId: 'l',
      assigneeId: 'u',
      hasDeadline: true,
    });
    expect(useFiltersStore.getState().priority).toBe('low');

    useFiltersStore.getState().reset();
    expect(selectFilterValues(useFiltersStore.getState())).toEqual({
      q: '',
      priority: null,
      labelId: null,
      assigneeId: null,
      hasDeadline: null,
    });
  });
});
