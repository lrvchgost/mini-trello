import { UserIcon } from 'lucide-react';
import { Label } from '@/shared/ui/label';
import { useAssignableUsersQuery, useAssignCardMutation } from '../hooks';

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60';

interface AssigneeSelectProps {
  cardId: string;
  boardId: string;
  assigneeId: string | null;
}

export function AssigneeSelect({ cardId, boardId, assigneeId }: AssigneeSelectProps) {
  const users = useAssignableUsersQuery();
  const assign = useAssignCardMutation(cardId, boardId);

  return (
    <div className="space-y-1.5">
      <Label htmlFor="card-assignee">Исполнитель</Label>
      <div className="relative">
        <UserIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <select
          id="card-assignee"
          className={`${selectClassName} pl-8`}
          value={assigneeId ?? ''}
          disabled={users.isPending || assign.isPending}
          onChange={(event) => assign.mutate(event.target.value || null)}
        >
          <option value="">Не назначен</option>
          {(users.data ?? []).map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
