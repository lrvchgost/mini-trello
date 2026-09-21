import type { z } from 'zod';
import type {
  columnSchema,
  columnWithCardsSchema,
  createColumnSchema,
  updateColumnSchema,
} from '../schemas/column';

export type Column = z.infer<typeof columnSchema>;
export type ColumnWithCards = z.infer<typeof columnWithCardsSchema>;
export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
