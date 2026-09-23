import type { z } from 'zod';
import type {
  boardListQuerySchema,
  boardListItemSchema,
  boardSchema,
  boardWithColumnsSchema,
  createBoardSchema,
  updateBoardSchema,
} from '../schemas/board';

export type Board = z.infer<typeof boardSchema>;
export type BoardListItem = z.infer<typeof boardListItemSchema>;
export type BoardWithColumns = z.infer<typeof boardWithColumnsSchema>;
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type BoardListQuery = z.infer<typeof boardListQuerySchema>;
