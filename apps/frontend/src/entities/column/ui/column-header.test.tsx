import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ColumnHeader } from './column-header';

describe('ColumnHeader', () => {
  it('renders the title and card count', () => {
    render(<ColumnHeader title="В работе" count={3} />);

    expect(screen.getByRole('heading', { name: 'В работе' })).toBeInTheDocument();
    expect(screen.getByLabelText('Карточек: 3')).toHaveTextContent('3');
  });

  it('shows the done marker only for done columns', () => {
    const { rerender } = render(<ColumnHeader title="Done" count={0} isDone />);
    expect(screen.getByText('Готово')).toBeInTheDocument();

    rerender(<ColumnHeader title="Done" count={0} />);
    expect(screen.queryByText('Готово')).not.toBeInTheDocument();
  });
});
