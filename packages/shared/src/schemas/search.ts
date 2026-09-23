import { z } from 'zod';
import { prioritySchema } from './card';
import { idSchema, paginationQuerySchema } from './common';

/** Query-строки приходят как `'true'`/`'false'`; приводим их к boolean явно. */
export const booleanQuerySchema = z.enum(['true', 'false']).transform((value) => value === 'true');

export const searchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(200).optional(),
  priority: prioritySchema.optional(),
  label: idSchema.optional(),
  assignee: idSchema.optional(),
  hasDeadline: booleanQuerySchema.optional(),
});
