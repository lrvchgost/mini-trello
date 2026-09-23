import { useState, type FormEvent } from 'react';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { DEFAULT_LABEL_COLOR, type Label } from '@min-trello/shared';
import { extractApiError, localizeApiError } from '@/shared/lib/errors';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useAttachLabel, useBoardLabelsQuery, useCreateLabel, useDetachLabel } from '../hooks';

interface LabelPickerProps {
  boardId: string;
  cardId: string;
  labels: Label[];
}

export function LabelPicker({ boardId, cardId, labels }: LabelPickerProps) {
  const query = useBoardLabelsQuery(boardId);
  const createLabel = useCreateLabel(boardId);
  const attachLabel = useAttachLabel(cardId, boardId);
  const detachLabel = useDetachLabel(cardId, boardId);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_LABEL_COLOR);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = new Set(labels.map((label) => label.id));
  const isToggling = attachLabel.isPending || detachLabel.isPending;

  function toggle(label: Label) {
    if (selectedIds.has(label.id)) {
      detachLabel.mutate(label.id);
    } else {
      attachLabel.mutate(label.id);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || createLabel.isPending) {
      return;
    }
    setError(null);
    try {
      await createLabel.mutateAsync({ name: trimmed, color });
      setName('');
    } catch (caught) {
      setError(localizeApiError(extractApiError(caught)));
    }
  }

  return (
    <section aria-label="Метки" className="space-y-3">
      <h3 className="text-sm font-semibold">Метки</h3>

      {query.isPending ? <p className="text-xs text-muted-foreground">Загружаем метки…</p> : null}

      {query.data && query.data.length === 0 ? (
        <p className="text-xs text-muted-foreground">В доске пока нет меток.</p>
      ) : null}

      {query.data && query.data.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {query.data.map((label) => {
            const selected = selectedIds.has(label.id);
            return (
              <li key={label.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  disabled={isToggling}
                  onClick={() => toggle(label)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium text-white transition-opacity disabled:opacity-60',
                    !selected && 'opacity-60',
                  )}
                  style={{ backgroundColor: label.color, borderColor: label.color }}
                >
                  {selected ? <CheckIcon className="size-3" /> : null}
                  {label.name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <form className="flex items-end gap-2" onSubmit={handleCreate}>
        <div className="flex-1 space-y-1">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Новая метка"
            aria-label="Название метки"
            maxLength={50}
          />
        </div>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            aria-label="Цвет метки"
            className="h-9 w-8 cursor-pointer rounded border bg-transparent"
          />
          Цвет
        </label>
        <Button type="submit" size="sm" variant="outline" disabled={createLabel.isPending}>
          <PlusIcon />
          Добавить
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
