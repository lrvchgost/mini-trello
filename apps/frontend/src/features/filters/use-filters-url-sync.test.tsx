import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useFiltersStore } from './store';
import { useFiltersUrlSync } from './use-filters-url-sync';

function Probe() {
  useFiltersUrlSync();
  const location = useLocation();
  return <output data-testid="search">{location.search}</output>;
}

function renderProbe(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe />
    </MemoryRouter>,
  );
}

describe('useFiltersUrlSync', () => {
  beforeEach(() => {
    useFiltersStore.getState().reset();
  });

  it('hydrates the store from the URL on mount', async () => {
    renderProbe('/boards/1?q=fix&priority=high&hasDeadline=true');

    await waitFor(() => {
      const state = useFiltersStore.getState();
      expect(state.q).toBe('fix');
      expect(state.priority).toBe('high');
      expect(state.hasDeadline).toBe(true);
    });
  });

  it('writes the store back to the URL', async () => {
    renderProbe('/boards/1');

    act(() => {
      useFiltersStore.getState().setQuery('login');
    });

    await waitFor(() => {
      expect(screen.getByTestId('search').textContent).toContain('q=login');
    });
  });

  it('removes empty filters from the URL', async () => {
    renderProbe('/boards/1?q=fix');

    await waitFor(() => expect(useFiltersStore.getState().q).toBe('fix'));

    act(() => {
      useFiltersStore.getState().reset();
    });

    await waitFor(() => {
      expect(screen.getByTestId('search').textContent).toBe('');
    });
  });
});
