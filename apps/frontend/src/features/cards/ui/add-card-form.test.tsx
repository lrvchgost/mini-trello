import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { boardQueryKeys } from '@/entities/board';
import { createTestQueryClient } from '@/test/query-wrapper';
import { AddCardForm } from './add-card-form';

const mocks = vi.hoisted(() => ({ api: { post: vi.fn() } }));

vi.mock('@/shared/api/ky-client', () => ({ api: mocks.api, setUnauthorizedHandler: vi.fn() }));

const boardId = 'clx000000000000000000001';
const columnId = 'clx000000000000000000201';

const cardJson = {
  id: 'clx000000000000000000101',
  title: 'Новая',
  description: null,
  priority: 'medium',
  deadline: null,
  order: 3,
  columnId,
  assigneeId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('AddCardForm', () => {
  beforeEach(() => {
    mocks.api.post.mockReset();
  });

  it('creates a card and refreshes the board', async () => {
    mocks.api.post.mockReturnValue({ json: vi.fn().mockResolvedValue(cardJson) });
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <AddCardForm boardId={boardId} columnId={columnId} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /добавить карточку/i }));
    fireEvent.change(screen.getByLabelText('Название новой карточки'), {
      target: { value: 'Новая карточка' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

    await waitFor(() =>
      expect(mocks.api.post).toHaveBeenCalledWith(`columns/${columnId}/cards`, {
        json: { title: 'Новая карточка', priority: 'medium' },
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: boardQueryKeys.detail(boardId) });
  });

  it('does not submit an empty title', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <AddCardForm boardId={boardId} columnId={columnId} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /добавить карточку/i }));

    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled();
    expect(mocks.api.post).not.toHaveBeenCalled();
  });
});
