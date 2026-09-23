import { useState, type FormEvent } from 'react';
import { PlusIcon } from 'lucide-react';
import { useCreateCard } from '@/entities/card';
import { extractApiError, localizeApiError } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

interface AddCardFormProps {
  boardId: string;
  columnId: string;
}

export function AddCardForm({ boardId, columnId }: AddCardFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createCard = useCreateCard(boardId);

  function reset() {
    setTitle('');
    setError(null);
    setOpen(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || createCard.isPending) {
      return;
    }
    setError(null);
    try {
      await createCard.mutateAsync({ columnId, input: { title: trimmed, priority: 'medium' } });
      setTitle('');
    } catch (caught) {
      setError(localizeApiError(extractApiError(caught)));
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-start"
        onClick={() => setOpen(true)}
      >
        <PlusIcon />
        Добавить карточку
      </Button>
    );
  }

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      <Input
        autoFocus
        value={title}
        aria-label="Название новой карточки"
        placeholder="Название карточки…"
        maxLength={200}
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
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={createCard.isPending || !title.trim()}>
          {createCard.isPending ? 'Создаём…' : 'Добавить'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={reset}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
