import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeCard } from '@/test/fixtures';
import { CardItem } from './card-item';

describe('CardItem', () => {
  it('renders the title and a localized priority label', () => {
    render(<CardItem card={makeCard({ title: 'Написать отчёт', priority: 'high' })} />);

    expect(screen.getByText('Написать отчёт')).toBeInTheDocument();
    expect(screen.getByText('Высокий')).toBeInTheDocument();
  });

  it('renders the deadline when present and omits it otherwise', () => {
    const { rerender } = render(
      <CardItem card={makeCard({ deadline: new Date('2026-12-01T00:00:00.000Z') })} />,
    );
    expect(screen.getByText(/01 дек/i)).toBeInTheDocument();

    rerender(<CardItem card={makeCard({ deadline: null })} />);
    expect(screen.queryByText(/01 дек/i)).not.toBeInTheDocument();
  });

  it('marks overdue deadlines', () => {
    render(<CardItem card={makeCard({ deadline: new Date('2020-01-01T00:00:00.000Z') })} />);

    expect(screen.getByText(/01 янв/i)).toHaveClass('text-destructive');
  });
});
