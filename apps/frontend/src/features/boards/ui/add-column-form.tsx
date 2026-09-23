import { useState, type FormEvent } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { useCreateColumn } from '@/entities/column';
import { extractApiError, localizeApiError } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/lib/utils';

interface AddColumnFormProps {
  boardId: string;
  className?: string;
}

export function AddColumnForm({ boardId, className }: AddColumnFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createColumn = useCreateColumn(boardId);

  function reset() {
    setTitle('');
    setError(null);
    setOpen(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || createColumn.isPending) {
      return;
    }
    setError(null);
    try {
      await createColumn.mutateAsync({ title: trimmed });
      setTitle('');
    } catch (caught) {
      setError(localizeApiError(extractApiError(caught)));
    }
  }

  return (
    <section
      aria-label={open ? 'Новая колонка' : undefined}
      className={cn('w-72 shrink-0 rounded-xl border border-dashed bg-muted/20 p-3', className)}
    >
      {open ? (
        <form className="space-y-2" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Новая колонка</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Отменить создание колонки"
              onClick={reset}
            >
              <XIcon />
            </Button>
          </div>
          <Input
            autoFocus
            value={title}
            aria-label="Название новой колонки"
            placeholder="Название колонки…"
            maxLength={100}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                reset();
              }
            }}
          />
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="sm" disabled={createColumn.isPending || !title.trim()}>
            {createColumn.isPending ? 'Создаём…' : 'Создать колонку'}
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => setOpen(true)}
        >
          <PlusIcon />
          Добавить колонку
        </Button>
      )}
    </section>
  );
}
