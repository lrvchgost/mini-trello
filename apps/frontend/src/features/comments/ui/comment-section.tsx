import { useState, type FormEvent } from 'react';
import { Trash2Icon } from 'lucide-react';
import type { Comment } from '@min-trello/shared';
import { useAuth } from '@/features/auth/useAuth';
import { extractApiError, localizeApiError } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { Loading } from '@/shared/ui/loading';
import { MarkdownRenderer } from '@/shared/ui/markdown';
import { Textarea } from '@/shared/ui/textarea';
import { useCommentsQuery, useCreateComment, useDeleteComment } from '../hooks';

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function CommentItem({
  comment,
  canDelete,
  onDelete,
  isDeleting,
}: {
  comment: Comment;
  canDelete: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const authorName = comment.author?.name ?? 'Пользователь';

  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{authorName}</p>
          <time
            className="text-xs text-muted-foreground"
            dateTime={comment.createdAt.toISOString()}
          >
            {dateTimeFormatter.format(comment.createdAt)}
          </time>
        </div>
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Удалить комментарий"
            disabled={isDeleting}
            onClick={() => onDelete(comment.id)}
          >
            <Trash2Icon />
          </Button>
        ) : null}
      </div>
      <MarkdownRenderer content={comment.content} className="mt-2" />
    </li>
  );
}

interface CommentSectionProps {
  cardId: string;
}

export function CommentSection({ cardId }: CommentSectionProps) {
  const { user } = useAuth();
  const query = useCommentsQuery(cardId);
  const createComment = useCreateComment(cardId);
  const deleteComment = useDeleteComment(cardId);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const comments = query.data?.pages.flatMap((page) => page.items) ?? [];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || createComment.isPending) {
      return;
    }
    setError(null);
    try {
      await createComment.mutateAsync(trimmed);
      setContent('');
    } catch (caught) {
      setError(localizeApiError(extractApiError(caught)));
    }
  }

  return (
    <section aria-label="Комментарии" className="space-y-3">
      <h3 className="text-sm font-semibold">Комментарии</h3>

      {query.isPending ? <Loading label="Загружаем комментарии…" /> : null}

      {query.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Не удалось загрузить комментарии.
        </p>
      ) : null}

      {!query.isPending && comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Комментариев пока нет.</p>
      ) : null}

      {comments.length > 0 ? (
        <ul className="space-y-2">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canDelete={comment.authorId === user?.id}
              onDelete={(id) => deleteComment.mutate(id)}
              isDeleting={deleteComment.isPending && deleteComment.variables === comment.id}
            />
          ))}
        </ul>
      ) : null}

      {query.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Загружаем…' : 'Показать ещё'}
        </Button>
      ) : null}

      <form className="space-y-2" onSubmit={handleSubmit}>
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Напишите комментарий…"
          aria-label="Новый комментарий"
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="sm" disabled={createComment.isPending || !content.trim()}>
          {createComment.isPending ? 'Отправляем…' : 'Отправить'}
        </Button>
      </form>
    </section>
  );
}
