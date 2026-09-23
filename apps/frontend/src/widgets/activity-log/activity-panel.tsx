import { cn } from '@/shared/lib/utils';
import { ActivityLog } from './activity-log';

interface ActivityPanelProps {
  boardId: string;
  open: boolean;
  className?: string;
}

/**
 * Collapsible right-hand panel that pushes the board content while sliding in.
 * The activity widget (and its SSE stream) only mounts while the panel is open.
 */
export function ActivityPanel({ boardId, open, className }: ActivityPanelProps) {
  return (
    <aside
      aria-label="Активность доски"
      aria-hidden={!open}
      className={cn(
        'shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out',
        open ? 'w-80' : 'w-0',
        className,
      )}
    >
      <div className="w-80 pl-4">
        {open ? (
          <ActivityLog
            boardId={boardId}
            className="sticky top-20 h-[calc(100vh-6rem)] max-h-none"
          />
        ) : null}
      </div>
    </aside>
  );
}
