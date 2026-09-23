import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFiltersStore } from '@/features/filters';
import { createTestQueryClient } from '@/test/query-wrapper';
import { SearchPage } from './SearchPage';

const mocks = vi.hoisted(() => ({
  api: { get: vi.fn() },
}));

vi.mock('@/shared/api/ky-client', () => ({ api: mocks.api }));

const cardJson = {
  id: 'clx000000000000000000101',
  title: 'Fix login',
  description: 'Something broken',
  priority: 'high',
  deadline: null,
  order: 0,
  columnId: 'clx000000000000000000201',
  assigneeId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function mockJson<T>(value: T) {
  return { json: vi.fn().mockResolvedValue(value) };
}

function renderPage(entry: string) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[entry]}>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SearchPage', () => {
  beforeEach(() => {
    useFiltersStore.getState().reset();
    mocks.api.get.mockImplementation((path: string) => {
      if (path === 'search') {
        return mockJson({ items: [cardJson], total: 1, page: 1, limit: 20 });
      }
      if (path === 'users') {
        return mockJson([]);
      }
      throw new Error(`Unexpected request: ${path}`);
    });
  });

  it('prompts for a query when no filters are set', () => {
    renderPage('/search');
    expect(screen.getByText('Введите запрос')).toBeInTheDocument();
    expect(mocks.api.get).not.toHaveBeenCalledWith('search', expect.anything());
  });

  it('restores filters from the URL and renders results', async () => {
    renderPage('/search?q=fix');

    expect(await screen.findByText('Fix login')).toBeInTheDocument();
    await waitFor(() => expect(mocks.api.get).toHaveBeenCalledWith('search', expect.anything()));
    expect(useFiltersStore.getState().q).toBe('fix');
  });

  it('shows an empty state when nothing matches', async () => {
    mocks.api.get.mockImplementation((path: string) => {
      if (path === 'search') {
        return mockJson({ items: [], total: 0, page: 1, limit: 20 });
      }
      return mockJson([]);
    });

    renderPage('/search?q=missing');

    expect(await screen.findByText('Ничего не найдено')).toBeInTheDocument();
  });
});
