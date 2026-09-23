import { HTTPError } from 'ky';
import { ErrorCode } from '@min-trello/shared';

interface ApiErrorBody {
  error?: unknown;
  message?: unknown;
  details?: unknown;
}

export interface ApiFieldIssue {
  path?: (string | number)[];
  message?: string;
}

export interface ApiErrorInfo {
  status: number | null;
  code: string | null;
  message: string;
  fieldErrors: Record<string, string>;
}

const MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.EMAIL_TAKEN]: 'Этот email уже зарегистрирован',
  [ErrorCode.UNAUTHORIZED]: 'Неверный email или пароль',
  [ErrorCode.VALIDATION_ERROR]: 'Проверьте заполнение формы',
};

export function extractErrorMessage(error: unknown): string {
  if (error instanceof HTTPError) {
    const data = error.data as ApiErrorBody | undefined;
    if (data && typeof data.message === 'string' && data.message.length > 0) {
      return data.message;
    }
    return error.response.statusText || 'Request failed';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unexpected error';
}

function extractFieldErrors(details: unknown): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  if (!Array.isArray(details)) {
    return fieldErrors;
  }
  for (const issue of details as ApiFieldIssue[]) {
    const path = issue.path?.[0];
    if (typeof path === 'string' && typeof issue.message === 'string' && !(path in fieldErrors)) {
      fieldErrors[path] = issue.message;
    }
  }
  return fieldErrors;
}

/** Normalizes an API failure into HTTP status, error code, message and per-field messages. */
export function extractApiError(error: unknown): ApiErrorInfo {
  if (error instanceof HTTPError) {
    const data = error.data as ApiErrorBody | undefined;
    return {
      status: error.response.status,
      code: typeof data?.error === 'string' ? data.error : null,
      message: extractErrorMessage(error),
      fieldErrors: extractFieldErrors(data?.details),
    };
  }
  if (error instanceof Error) {
    return { status: null, code: null, message: error.message, fieldErrors: {} };
  }
  return { status: null, code: null, message: 'Unexpected error', fieldErrors: {} };
}

/** Replaces a server error code with a localized message when one is known. */
export function localizeApiError(info: ApiErrorInfo): string {
  const localized = info.code ? MESSAGES[info.code as ErrorCode] : undefined;
  return localized ?? info.message;
}
