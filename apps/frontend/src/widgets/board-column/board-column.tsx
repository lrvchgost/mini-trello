import { memo } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Link } from 'react-router-dom';
import type { ColumnWithCards } from '@min-trello/shared';
import { CardItem } from '@/entities/card';
import { AddCardForm } from '@/features/cards';
import { ColumnHeader } from '@/entities/column';
import { byOrder } from '@/shared/lib/order';
import { cn } from '@/shared/lib/utils';

interface BoardColumnProps {
  column: ColumnWithCards;
}

function BoardColumnComponent({ column }: BoardColumnProps) {
  const cards = [...column.cards].sort(byOrder);

  return (
    <section
      aria-label={column.title}
      className="flex w-72 shrink-0 flex-col gap-3 rounded-xl border bg-muted/40 p-3"
    >
      <ColumnHeader title={column.title} count={cards.length} isDone={column.isDone} />
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <ul
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex flex-1 flex-col gap-2 rounded-lg transition-colors',
              snapshot.isDraggingOver && 'bg-background/70',
            )}
          >
            {cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <li
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    style={dragProvided.draggableProps.style}
                    className={cn('list-none', dragSnapshot.isDragging && 'opacity-90')}
                  >
                    <Link
                      to={`cards/${card.id}`}
                      className="block rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <CardItem card={card} />
                    </Link>
                  </li>
                )}
              </Draggable>
            ))}
            {cards.length === 0 ? (
              <li className="list-none rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                Нет карточек
              </li>
            ) : null}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
      <AddCardForm boardId={column.boardId} columnId={column.id} />
    </section>
  );
}

export const BoardColumn = memo(BoardColumnComponent);
