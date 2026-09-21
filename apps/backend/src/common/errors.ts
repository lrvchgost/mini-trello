import { ErrorCode } from '@min-trello/shared';

export { ErrorCode };

const HTTP_ERROR_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: 'NOT_FOUND',
  409: ErrorCode.CONFLICT,
  422: ErrorCode.VALIDATION_ERROR,
  429: 'TOO_MANY_REQUESTS',
  500: ErrorCode.INTERNAL_ERROR,
};

export function errorCodeFromStatus(status: number): string {
  return HTTP_ERROR_CODES[status] ?? ErrorCode.INTERNAL_ERROR;
}
