import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '@/test/query-wrapper';
import { ActivityLog } from './activity-log';

const mocks = vi.hoisted(() => ({
  api: { get: vi.fn() },
  useActivityLive: vi.fn(() => 'open'),
}));

vi.mock('@/shared/api/ky-client', () => ({ api: mocks.api }));
vi.mock('@/features/live', () => ({ useActivityLive: mocks.useActivityLive }));

const boardId = 'clx000000000000000000001';

const activityPage = {
  items: [
    {
      id: 'clx000000000000000000702',
      action: 'card.created',
      payload: { cardId: 'clx000000000000000000101', title: 'Тест' },
      boardId,
      cardId: 'clx000000000000000000101',
      userId: 'clx000000000000000000002',
      createdAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'clx000000000000000000701',
      action: 'board.updated',
      payload: { changes: { title: 'Работа' } },
      boardId,
      cardId: null,
      userId: 'clx000000000000000000002',
      createdAt: '2026-01-01T09:00:00.000Z',
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
};

describe('ActivityLog', () => {
  beforeEach(() => {
    mocks.api.get.mockReset();
    mocks.useActivityLive.mockReturnValue('open');
  });

  it('renders streamed activity entries with human-readable labels', async () => {
    mocks.api.get.mockReturnValue({ json: vi.fn().mockResolvedValue(activityPage) });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ActivityLog boardId={boardId} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('создал(а) карточку «Тест»')).toBeInTheDocument();
    expect(screen.getByText('изменил(а) доску')).toBeInTheDocument();
    expect(mocks.api.get).toHaveBeenCalledWith(`boards/${boardId}/activity`, {
      searchParams: { page: 1, limit: 20 },
    });
    expect(mocks.useActivityLive).toHaveBeenCalledWith(boardId);
  });

  it('shows an empty state when there is no activity', async () => {
    mocks.api.get.mockReturnValue({
      json: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ActivityLog boardId={boardId} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText('Пока пусто')).toBeInTheDocument());
  });
});
