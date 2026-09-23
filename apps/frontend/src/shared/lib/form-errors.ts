import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { ErrorCode } from '@min-trello/shared';
import { extractApiError, localizeApiError } from './errors';

/** Server error codes that belong to a specific form field instead of the whole form. */
const CODE_TO_FIELD: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.EMAIL_TAKEN]: 'email',
  [ErrorCode.INVALID_ASSIGNEE]: 'assigneeId',
  [ErrorCode.INVALID_LABEL]: 'labelId',
};

/** Maps an API failure (e.g. 401/409/422) onto react-hook-form field and root errors. */
export function applyServerErrors<TFieldValues extends FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  error: unknown,
): void {
  const info = extractApiError(error);
  const message = localizeApiError(info);

  for (const [field, fieldMessage] of Object.entries(info.fieldErrors)) {
    setError(field as FieldPath<TFieldValues>, { type: 'server', message: fieldMessage });
  }

  const mappedField = info.code ? CODE_TO_FIELD[info.code as ErrorCode] : undefined;
  if (mappedField) {
    setError(mappedField as FieldPath<TFieldValues>, { type: 'server', message });
    return;
  }

  setError('root', { type: 'server', message });
}
