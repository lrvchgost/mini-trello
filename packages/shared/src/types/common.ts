import type { z } from 'zod';
import type { paginationQuerySchema } from '../schemas/common';

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
