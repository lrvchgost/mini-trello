import { create } from 'zustand';
import type { Priority } from '@min-trello/shared';
import { emptyFilters, type FilterValues } from './lib';

export interface FiltersState extends FilterValues {
  setQuery: (q: string) => void;
  setPriority: (priority: Priority | null) => void;
  setLabelId: (labelId: string | null) => void;
  setAssigneeId: (assigneeId: string | null) => void;
  setHasDeadline: (hasDeadline: boolean | null) => void;
  setAll: (values: FilterValues) => void;
  reset: () => void;
}

export const useFiltersStore = create<FiltersState>((set) => ({
  ...emptyFilters,

  setQuery: (q) => set({ q }),
  setPriority: (priority) => set({ priority }),
  setLabelId: (labelId) => set({ labelId }),
  setAssigneeId: (assigneeId) => set({ assigneeId }),
  setHasDeadline: (hasDeadline) => set({ hasDeadline }),
  setAll: (values) => set(values),
  reset: () => set(emptyFilters),
}));

export function selectFilterValues(state: FiltersState): FilterValues {
  return {
    q: state.q,
    priority: state.priority,
    labelId: state.labelId,
    assigneeId: state.assigneeId,
    hasDeadline: state.hasDeadline,
  };
}
