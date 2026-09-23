import { useEffect, useState, type FormEvent } from 'react';
import { Trash2Icon } from 'lucide-react';
import {
  PRIORITIES,
  type CardDetail,
  type Priority,
  type UpdateCardInput,
} from '@min-trello/shared';
import { useDeleteCard, useUpdateCard } from '@/entities/card';
import { extractApiError, localizeApiError } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { MarkdownEditor } from '@/shared/ui/markdown';

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочный',
};

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60';

function toDateInputValue(date: Date | null): string {
  if (!date) {
    return '';
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromDateInputValue(value: string): Date | null {
  return value ? new Date(`${value}T00:00:00`) : null;
}

interface CardFormProps {
  card: CardDetail;
  boardId: string;
  onDeleted: () => void;
  onConflict: () => void;
}

export function CardForm({ card, boardId, onDeleted, onConflict }: CardFormProps) {
  const updateCard = useUpdateCard(boardId);
  const deleteCard = useDeleteCard(boardId);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');
  const [priority, setPriority] = useState<Priority>(card.priority);
  const [deadline, setDeadline] = useState(toDateInputValue(card.deadline));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description ?? '');
    setPriority(card.priority);
    setDeadline(toDateInputValue(card.deadline));
  }, [card.id, card.updatedAt, card.title, card.description, card.priority, card.deadline]);

  const dirty =
    title.trim() !== card.title ||
    description !== (card.description ?? '') ||
    priority !== card.priority ||
    toDateInputValue(card.deadline) !== deadline;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (updateCard.isPending) {
      return;
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Заголовок не может быть пустым');
      return;
    }
    setError(null);
    setSaved(false);
    const input: UpdateCardInput = {
      title: trimmedTitle,
      description: description.trim() ? description : null,
      priority,
      deadline: fromDateInputValue(deadline),
      expectedUpdatedAt: card.updatedAt,
    };
    try {
      await updateCard.mutateAsync({ id: card.id, input });
      setSaved(true);
    } catch (caught) {
      const info = extractApiError(caught);
      setError(localizeApiError(info));
      if (info.status === 409) {
        onConflict();
      }
    }
  }

  async function handleDelete() {
    if (!window.confirm('Удалить карточку? Это действие нельзя отменить.')) {
      return;
    }
    try {
      await deleteCard.mutateAsync(card.id);
      onDeleted();
    } catch (caught) {
      setError(localizeApiError(extractApiError(caught)));
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <Label htmlFor="card-title">Заголовок</Label>
        <Input
          id="card-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
        />
      </div>

      <MarkdownEditor
        value={description}
        onChange={setDescription}
        label="Описание"
        placeholder="Поддерживается Markdown…"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="card-priority">Приоритет</Label>
          <select
            id="card-priority"
            className={selectClassName}
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
          >
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="card-deadline">Дедлайн</Label>
          <input
            id="card-deadline"
            type="date"
            className={selectClassName}
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {saved && !error ? (
        <p className="text-sm text-muted-foreground">Изменения сохранены</p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <Button type="submit" disabled={updateCard.isPending || !dirty}>
          {updateCard.isPending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={deleteCard.isPending}
          onClick={() => void handleDelete()}
        >
          <Trash2Icon />
          {deleteCard.isPending ? 'Удаляем…' : 'Удалить'}
        </Button>
      </div>
    </form>
  );
}
