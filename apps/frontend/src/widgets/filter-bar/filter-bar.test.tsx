import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOBILE_QUERY } from '@/shared/hooks/use-media-query';
import { useFiltersStore } from '@/features/filters';
import { createTestQueryClient } from '@/test/query-wrapper';
import { FilterBar } from './filter-bar';

const mocks = vi.hoisted(() => ({
  api: { get: vi.fn() },
}));

vi.mock('@/shared/api/ky-client', () => ({ api: mocks.api }));

const boardId = 'clx000000000000000000001';

function mockJson<T>(value: T) {
  return { json: vi.fn().mockResolvedValue(value) };
}

function mockMobile() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: true,
      media: MOBILE_QUERY,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

function renderBar(props: { boardId?: string } = { boardId }) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <FilterBar {...props} />
    </QueryClientProvider>,
  );
}

describe('FilterBar', () => {
  beforeEach(() => {
    useFiltersStore.getState().reset();
    mocks.api.get.mockImplementation((path: string) => {
      if (path === 'users') {
        return mockJson([
          {
            id: 'clx000000000000000000002',
            email: 'alice@example.com',
            name: 'Alice',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ]);
      }
      return mockJson([{ id: 'clx000000000000000000003', name: 'bug', color: '#ff0000', boardId }]);
    });
  });

  it('updates the query filter while typing', async () => {
    const user = userEvent.setup();
    renderBar();

    await user.type(screen.getByLabelText('Поиск по карточкам'), 'log');

    expect(useFiltersStore.getState().q).toBe('log');
  });

  it('updates priority and deadline selects', async () => {
    const user = userEvent.setup();
    renderBar();

    await user.selectOptions(screen.getByLabelText('Приоритет'), 'high');
    await user.selectOptions(screen.getByLabelText('Дедлайн'), 'true');

    expect(useFiltersStore.getState().priority).toBe('high');
    expect(useFiltersStore.getState().hasDeadline).toBe(true);
  });

  it('loads board labels and assignees', async () => {
    renderBar();

    expect(await screen.findByRole('option', { name: 'bug' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Alice' })).toBeInTheDocument();
  });

  it('resets all filters', async () => {
    const user = userEvent.setup();
    renderBar();

    await user.type(screen.getByLabelText('Поиск по карточкам'), 'x');
    await user.click(screen.getByRole('button', { name: /сбросить/i }));

    await waitFor(() => expect(useFiltersStore.getState().q).toBe(''));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('collapses into a bottom sheet on mobile', async () => {
    mockMobile();
    const user = userEvent.setup();
    renderBar();

    expect(screen.queryByLabelText('Поиск по карточкам')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /фильтры/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Поиск по карточкам')).toBeInTheDocument();
  });

  it('hides the label filter without a board context', async () => {
    renderBar({});
    await waitFor(() => expect(mocks.api.get).toHaveBeenCalledWith('users'));
    expect(screen.queryByLabelText('Метка')).not.toBeInTheDocument();
  });
});
