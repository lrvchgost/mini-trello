import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeHttpError } from '@/test/http-error';
import { createTestQueryClient } from '@/test/query-wrapper';
import { BoardPage } from './BoardPage';

const mocks = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('@/shared/api/ky-client', () => ({ api: mocks.api }));
vi.mock('@/features/live', () => ({
  useBoardLive: vi.fn(),
  useActivityLive: vi.fn(() => 'open'),
}));

const boardId = 'clx000000000000000000001';

const boardJson = {
  id: boardId,
  title: 'Работа',
  ownerId: 'clx000000000000000000002',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  columns: [
    {
      id: 'clx000000000000000000301',
      title: 'Готово',
      isDone: true,
      order: 1,
      boardId,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      cards: [],
    },
    {
      id: 'clx000000000000000000201',
      title: 'В работе',
      isDone: false,
      order: 0,
      boardId,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      cards: [
        {
          id: 'clx000000000000000000902',
          title: 'Вторая',
          description: null,
          priority: 'low',
          deadline: null,
          order: 1,
          columnId: 'clx000000000000000000201',
          assigneeId: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'clx000000000000000000901',
          title: 'Первая',
          description: null,
          priority: 'urgent',
          deadline: null,
          order: 0,
          columnId: 'clx000000000000000000201',
          assigneeId: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
  ],
};

function mockJson<T>(value: T) {
  return { json: vi.fn().mockResolvedValue(value) };
}

function renderPage() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/boards/${boardId}`]}>
        <Routes>
          <Route path="/boards/:id" element={<BoardPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BoardPage', () => {
  beforeEach(() => {
    mocks.api.get.mockReset();
    mocks.api.post.mockReset();
  });

  it('renders columns in order with cards sorted inside them', async () => {
    mocks.api.get.mockReturnValue(mockJson(boardJson));
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Работа' })).toBeInTheDocument();

    const columns = screen.getAllByRole('region');
    expect(columns[0]).toHaveAccessibleName('В работе');
    expect(columns[1]).toHaveAccessibleName('Готово');

    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('Первая');
    expect(cards[1]).toHaveTextContent('Вторая');
  });

  it('shows a not-found state for a 404', async () => {
    mocks.api.get.mockReturnValue({
      json: vi
        .fn()
        .mockRejectedValue(
          makeHttpError(404, { error: 'BOARD_NOT_FOUND', message: 'Board not found' }),
        ),
    });
    renderPage();

    expect(await screen.findByText('Доска не найдена')).toBeInTheDocument();
  });

  it('shows the column composer when the board has no columns', async () => {
    mocks.api.get.mockReturnValue(mockJson({ ...boardJson, columns: [] }));
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /добавить колонку/i })).toBeInTheDocument(),
    );
  });

  it('reveals the activity panel on demand', async () => {
    mocks.api.get.mockImplementation((path: string) =>
      path.endsWith('/activity')
        ? mockJson({ items: [], total: 0, page: 1, limit: 20 })
        : mockJson(boardJson),
    );
    renderPage();

    await screen.findByRole('heading', { name: 'Работа' });
    expect(mocks.api.get).not.toHaveBeenCalledWith(`boards/${boardId}/activity`, expect.anything());

    fireEvent.click(screen.getByRole('button', { name: /активность/i }));

    expect(await screen.findByText('Пока пусто')).toBeInTheDocument();
  });
});
