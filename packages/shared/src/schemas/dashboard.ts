import { z } from 'zod';
import { idSchema } from './common';

export const cardsByStatusSchema = z.object({
  columnId: idSchema,
  columnTitle: z.string().min(1).max(200),
  count: z.number().int().nonnegative(),
});

export const dashboardStatsSchema = z.object({
  totalBoards: z.number().int().nonnegative(),
  totalCards: z.number().int().nonnegative(),
  cardsByStatus: z.array(cardsByStatusSchema),
  overdueCards: z.number().int().nonnegative(),
});
