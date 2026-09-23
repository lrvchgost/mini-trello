import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '@/test/query-wrapper';
import { CardModal } from './card-modal';

const mocks = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/shared/api/ky-client', () => ({
  api: mocks.api,
  setUnauthorizedHandler: vi.fn(),
}));

vi.mock('@/shared/ui/markdown', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
  MarkdownEditor: ({
    value,
    onChange,
    label,
  }: {
    value: string;
    onChange: (value: string) => void;
    label?: string;
  }) => (
    <textarea
      aria-label={label ?? 'Описание'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

const boardId = 'clx000000000000000000001';
const cardId = 'clx000000000000000000101';
const userId = 'clx000000000000000000002';

const cardDetailJson = {
  id: cardId,
  title: 'Карточка',
  description: 'Описание карточки',
  priority: 'high',
  deadline: null,
  order: 0,
  columnId: 'clx000000000000000000201',
  assigneeId: userId,
  assignee: {
    id: userId,
    email: 'alice@example.com',
    name: 'Alice',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  labels: [{ id: 'clx000000000000000000401', name: 'bug', color: '#ff0000', boardId }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const usersJson = [
  {
    id: userId,
    email: 'alice@example.com',
    name: 'Alice',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const labelsJson = [{ id: 'clx000000000000000000401', name: 'bug', color: '#ff0000', boardId }];

const commentsJson = {
  items: [
    {
      id: 'clx000000000000000000501',
      content: 'Первый комментарий',
      cardId,
      authorId: userId,
      author: usersJson[0],
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
};

function jsonResponse<T>(value: T) {
  return { json: vi.fn().mockResolvedValue(value) };
}

function renderModal() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/boards/${boardId}/cards/${cardId}`]}>
        <Routes>
          <Route path="/boards/:id/cards/:cardId" element={<CardModal />} />
          <Route path="/boards/:id" element={<div>Board page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CardModal', () => {
  beforeEach(() => {
    mocks.api.get.mockReset();
    mocks.api.post.mockReset();
    mocks.api.patch.mockReset();
    mocks.api.delete.mockReset();

    mocks.api.get.mockImplementation((url: string) => {
      if (url === `cards/${cardId}`) return jsonResponse(cardDetailJson);
      if (url === 'users') return jsonResponse(usersJson);
      if (url === `boards/${boardId}/labels`) return jsonResponse(labelsJson);
      if (url === `cards/${cardId}/comments`) return jsonResponse(commentsJson);
      throw new Error(`Unexpected GET ${url}`);
    });
  });

  it('shows card fields, labels, assignee and comments', async () => {
    renderModal();

    expect(await screen.findByDisplayValue('Карточка')).toBeInTheDocument();
    expect(screen.getByLabelText('Описание')).toHaveValue('Описание карточки');
    expect(await screen.findByRole('button', { name: 'bug' })).toBeInTheDocument();
    expect(await screen.findByText('Первый комментарий')).toBeInTheDocument();

    const assignee = screen.getByLabelText('Исполнитель');
    await waitFor(() => expect(assignee).toHaveValue(userId));
  });

  it('saves edits with optimistic-locking metadata', async () => {
    mocks.api.patch.mockReturnValue(jsonResponse({ ...cardDetailJson, title: 'Обновлено' }));
    renderModal();

    const title = await screen.findByLabelText('Заголовок');
    fireEvent.change(title, { target: { value: 'Обновлено' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() =>
      expect(mocks.api.patch).toHaveBeenCalledWith(
        `cards/${cardId}`,
        expect.objectContaining({
          json: expect.objectContaining({
            title: 'Обновлено',
            expectedUpdatedAt: expect.any(Date),
          }),
        }),
      ),
    );
    expect(await screen.findByText('Изменения сохранены')).toBeInTheDocument();
  });

  it('closes to the board when the dialog requests to close', async () => {
    renderModal();

    await screen.findByDisplayValue('Карточка');
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));

    expect(await screen.findByText('Board page')).toBeInTheDocument();
  });
});
