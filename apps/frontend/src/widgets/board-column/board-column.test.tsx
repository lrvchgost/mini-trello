import { DragDropContext } from '@hello-pangea/dnd';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { createTestQueryClient } from '@/test/query-wrapper';
import { makeCard, makeColumn } from '@/test/fixtures';
import { BoardColumn } from './board-column';

const columnId = 'clx000000000000000000201';
const boardId = 'clx000000000000000000001';

function renderColumn(ui: ReactElement) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/boards/${boardId}`]}>
        <DragDropContext onDragEnd={() => undefined}>{ui}</DragDropContext>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BoardColumn', () => {
  it('renders cards sorted by order within the column', () => {
    renderColumn(
      <BoardColumn
        column={makeColumn({
          cards: [
            makeCard({ id: 'clx000000000000000000903', title: 'Третья', order: 2, columnId }),
            makeCard({ id: 'clx000000000000000000901', title: 'Первая', order: 0, columnId }),
            makeCard({ id: 'clx000000000000000000902', title: 'Вторая', order: 1, columnId }),
          ],
        })}
      />,
    );

    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent('Первая');
    expect(cards[1]).toHaveTextContent('Вторая');
    expect(cards[2]).toHaveTextContent('Третья');
  });

  it('renders the column title and card count', () => {
    renderColumn(<BoardColumn column={makeColumn({ title: 'Бэклог', cards: [] })} />);

    expect(screen.getByRole('heading', { name: 'Бэклог' })).toBeInTheDocument();
    expect(screen.getByLabelText('Карточек: 0')).toBeInTheDocument();
  });

  it('shows an empty placeholder when there are no cards', () => {
    renderColumn(<BoardColumn column={makeColumn({ cards: [] })} />);

    expect(screen.getByText('Нет карточек')).toBeInTheDocument();
  });

  it('wraps each card in a link to the card modal', () => {
    renderColumn(
      <BoardColumn
        column={makeColumn({
          cards: [
            makeCard({ id: 'clx000000000000000000901', title: 'Первая', order: 0, columnId }),
          ],
        })}
      />,
    );

    expect(screen.getByRole('link', { name: /Первая/ })).toHaveAttribute(
      'href',
      expect.stringContaining('cards/clx000000000000000000901'),
    );
  });
});
