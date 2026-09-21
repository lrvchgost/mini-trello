import type { z } from 'zod';
import type {
  assignCardSchema,
  cardDetailSchema,
  cardSchema,
  createCardSchema,
  moveCardSchema,
  updateCardSchema,
} from '../schemas/card';

export type Card = z.infer<typeof cardSchema>;
export type CardDetail = z.infer<typeof cardDetailSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
export type AssignCardInput = z.infer<typeof assignCardSchema>;
