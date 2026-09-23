import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { BoardListItem } from '@min-trello/shared';
import { BoardList } from './board-list';

const board: BoardListItem = {
  id: 'clx000000000000000000001',
  title: 'Работа',
  ownerId: 'clx000000000000000000002',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  cardsCount: 7,
};

function renderList(props: Partial<Parameters<typeof BoardList>[0]> = {}) {
  return render(
    <MemoryRouter>
      <BoardList boards={[board]} page={1} limit={2} total={5} onPageChange={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

describe('BoardList', () => {
  it('links each board to its board page', () => {
    renderList();

    expect(screen.getByRole('link', { name: /работа/i })).toHaveAttribute(
      'href',
      `/boards/${board.id}`,
    );
    expect(screen.getByText('Страница 1 из 3')).toBeInTheDocument();
  });

  it('shows the number of cards in each board', () => {
    renderList();

    expect(screen.getByLabelText('Карточек на доске: 7')).toHaveTextContent('7');
  });

  it('requests the next page and disables "Назад" on the first page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderList({ onPageChange });

    expect(screen.getByRole('button', { name: /назад/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /вперёд/i }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('hides pagination when everything fits on one page', () => {
    renderList({ total: 1 });

    expect(screen.queryByRole('navigation', { name: /пагинация/i })).not.toBeInTheDocument();
  });
});
