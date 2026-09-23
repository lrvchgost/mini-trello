import { Badge } from '@/shared/ui/badge';

interface ColumnHeaderProps {
  title: string;
  count: number;
  isDone?: boolean;
}

export function ColumnHeader({ title, count, isDone = false }: ColumnHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        {isDone ? <Badge variant="secondary">Готово</Badge> : null}
      </div>
      <Badge variant="outline" aria-label={`Карточек: ${count}`}>
        {count}
      </Badge>
    </header>
  );
}
