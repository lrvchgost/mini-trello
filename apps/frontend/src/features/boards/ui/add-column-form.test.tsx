import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { boardQueryKeys } from '@/entities/board';
import { createTestQueryClient } from '@/test/query-wrapper';
import { AddColumnForm } from './add-column-form';

const mocks = vi.hoisted(() => ({ api: { post: vi.fn() } }));

vi.mock('@/shared/api/ky-client', () => ({ api: mocks.api, setUnauthorizedHandler: vi.fn() }));

const boardId = 'clx000000000000000000001';

const columnJson = {
  id: 'clx000000000000000000201',
  title: 'Бэклог',
  isDone: false,
  order: 0,
  boardId,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('AddColumnForm', () => {
  beforeEach(() => {
    mocks.api.post.mockReset();
  });

  it('creates a column and refreshes the board', async () => {
    mocks.api.post.mockReturnValue({ json: vi.fn().mockResolvedValue(columnJson) });
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <AddColumnForm boardId={boardId} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /добавить колонку/i }));
    fireEvent.change(screen.getByLabelText('Название новой колонки'), {
      target: { value: 'Бэклог' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Создать колонку' }));

    await waitFor(() =>
      expect(mocks.api.post).toHaveBeenCalledWith(`boards/${boardId}/columns`, {
        json: { title: 'Бэклог' },
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: boardQueryKeys.detail(boardId) });
  });

  it('does not submit an empty title', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <AddColumnForm boardId={boardId} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /добавить колонку/i }));

    expect(screen.getByRole('button', { name: 'Создать колонку' })).toBeDisabled();
    expect(mocks.api.post).not.toHaveBeenCalled();
  });
});
