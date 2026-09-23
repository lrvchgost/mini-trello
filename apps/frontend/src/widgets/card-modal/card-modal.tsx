import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { cardQueryKeys, useCardQuery } from '@/entities/card';
import { AssigneeSelect } from '@/features/cards';
import { CommentSection } from '@/features/comments';
import { LabelPicker } from '@/features/labels';
import { extractApiError } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
import { Loading } from '@/shared/ui/loading';
import { CardForm } from './card-form';

export function CardModal() {
  const { id: boardId = '', cardId = '' } = useParams<{ id: string; cardId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: card, isPending, isError, error } = useCardQuery(cardId);

  const boardHref = `/boards/${boardId}`;
  const notFound = isError && extractApiError(error).status === 404;

  function close() {
    navigate(boardHref);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[96rem]">
        <DialogTitle className="sr-only">{card ? card.title : 'Карточка'}</DialogTitle>
        <DialogDescription className="sr-only">
          Редактирование карточки, метки, исполнитель и комментарии
        </DialogDescription>

        {isPending ? <Loading label="Загружаем карточку…" /> : null}

        {notFound ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">Карточка не найдена.</p>
            <Button onClick={close}>К доске</Button>
          </div>
        ) : null}

        {isError && !notFound ? (
          <p role="alert" className="text-sm text-destructive">
            Не удалось загрузить карточку.
          </p>
        ) : null}

        {card ? (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <CardForm
                card={card}
                boardId={boardId}
                onDeleted={close}
                onConflict={() =>
                  void queryClient.invalidateQueries({ queryKey: cardQueryKeys.detail(cardId) })
                }
              />
              <aside className="space-y-5 lg:border-l lg:pl-6">
                <AssigneeSelect cardId={card.id} boardId={boardId} assigneeId={card.assigneeId} />
                <LabelPicker boardId={boardId} cardId={card.id} labels={card.labels} />
              </aside>
            </div>

            <div className="border-t pt-5">
              <CommentSection cardId={card.id} />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
