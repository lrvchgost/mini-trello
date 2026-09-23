import type { ColumnWithCards } from '@min-trello/shared';
import { CardItem } from '@/entities/card';
import { ColumnHeader } from '@/entities/column';
import { byOrder } from '@/shared/lib/order';

interface BoardColumnProps {
  column: ColumnWithCards;
}

export function BoardColumn({ column }: BoardColumnProps) {
  const cards = [...column.cards].sort(byOrder);

  return (
    <section
      aria-label={column.title}
      className="flex w-72 shrink-0 flex-col gap-3 rounded-xl border bg-muted/40 p-3"
    >
      <ColumnHeader title={column.title} count={cards.length} isDone={column.isDone} />
      {cards.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          Нет карточек
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cards.map((card) => (
            <li key={card.id}>
              <CardItem card={card} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
