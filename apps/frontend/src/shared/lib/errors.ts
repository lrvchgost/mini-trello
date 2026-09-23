import { HTTPError } from 'ky';

interface ApiErrorBody {
  message?: unknown;
}

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
