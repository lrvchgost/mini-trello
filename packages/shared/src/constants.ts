export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export type Priority = (typeof PRIORITIES)[number];

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const DEFAULT_LABEL_COLOR = '#6b7280';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export const ACTIVITY_ACTIONS = [
  'board.created',
  'board.updated',
  'board.deleted',
  'column.created',
  'column.updated',
  'column.deleted',
  'card.created',
  'card.updated',
  'card.moved',
  'card.deleted',
  'card.assignee_changed',
  'card.label_added',
  'card.label_removed',
  'comment.created',
  'comment.deleted',
  'label.created',
  'label.updated',
  'label.deleted',
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  BOARD_NOT_FOUND: 'BOARD_NOT_FOUND',
  COLUMN_NOT_FOUND: 'COLUMN_NOT_FOUND',
  CARD_NOT_FOUND: 'CARD_NOT_FOUND',
  COMMENT_NOT_FOUND: 'COMMENT_NOT_FOUND',
  LABEL_NOT_FOUND: 'LABEL_NOT_FOUND',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  CONFLICT: 'CONFLICT',
  INVALID_ASSIGNEE: 'INVALID_ASSIGNEE',
  INVALID_LABEL: 'INVALID_LABEL',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
