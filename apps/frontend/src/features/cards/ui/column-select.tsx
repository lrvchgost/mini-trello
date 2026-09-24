import { Columns3Icon } from 'lucide-react';
import { useBoardQuery } from '@/entities/board';
import { byOrder } from '@/shared/lib/order';
import { Label } from '@/shared/ui/label';
import { useMoveCard } from '../model';

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60';

interface ColumnSelectProps {
  cardId: string;
  boardId: string;
  columnId: string;
}

export function ColumnSelect({ cardId, boardId, columnId }: ColumnSelectProps) {
  const board = useBoardQuery(boardId);
  const moveCard = useMoveCard(boardId);
  const columns = [...(board.data?.columns ?? [])].sort(byOrder);

  function handleChange(nextColumnId: string) {
    if (!nextColumnId || nextColumnId === columnId) {
      return;
    }
    const target = columns.find((column) => column.id === nextColumnId);
    moveCard.mutate({
      id: cardId,
      input: { columnId: nextColumnId, order: target?.cards.length ?? 0 },
    });
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="card-column">Колонка</Label>
      <div className="relative">
        <Columns3Icon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <select
          id="card-column"
          className={`${selectClassName} pl-8`}
          value={columnId}
          disabled={board.isPending || moveCard.isPending || columns.length === 0}
          onChange={(event) => handleChange(event.target.value)}
        >
          {columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.title}
            </option>
          ))}
        </select>
      </div>
      {moveCard.isError ? (
        <p role="alert" className="text-xs text-destructive">
          Не удалось переместить карточку.
        </p>
      ) : null}
    </div>
  );
}
