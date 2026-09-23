import type { ActivityLog } from '@min-trello/shared';

const ACTION_LABELS: Record<string, string> = {
  'board.created': 'создал(а) доску',
  'board.updated': 'изменил(а) доску',
  'board.deleted': 'удалил(а) доску',
  'column.created': 'создал(а) колонку',
  'column.updated': 'изменил(а) колонку',
  'column.deleted': 'удалил(а) колонку',
  'card.created': 'создал(а) карточку',
  'card.updated': 'изменил(а) карточку',
  'card.moved': 'переместил(а) карточку',
  'card.deleted': 'удалил(а) карточку',
  'card.assignee_changed': 'сменил(а) исполнителя',
  'card.label_added': 'добавил(а) метку',
  'card.label_removed': 'снял(а) метку',
  'comment.created': 'оставил(а) комментарий',
  'comment.deleted': 'удалил(а) комментарий',
  'label.created': 'создал(а) метку',
  'label.updated': 'изменил(а) метку',
  'label.deleted': 'удалил(а) метку',
};

function payloadTitle(payload: unknown): string | null {
  if (payload && typeof payload === 'object' && 'title' in payload) {
    const value = (payload as { title?: unknown }).title;
    return typeof value === 'string' && value.length > 0 ? value : null;
  }
  return null;
}

/** Human-readable sentence for an activity record. */
export function describeActivity(activity: ActivityLog): string {
  const label = ACTION_LABELS[activity.action] ?? activity.action;
  const title = payloadTitle(activity.payload);
  return title ? `${label} «${title}»` : label;
}

export function formatActivityTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}
