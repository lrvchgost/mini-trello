import { z } from 'zod';
import { columnWithCardsSchema } from './column';
import { idSchema, paginationQuerySchema } from './common';

export const boardSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  ownerId: idSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const boardWithColumnsSchema = boardSchema.extend({
  columns: z.array(columnWithCardsSchema),
});

export const boardListItemSchema = boardSchema.extend({
  cardsCount: z.number().int().nonnegative(),
});

export const createBoardSchema = z.object({
  title: z.string().min(1).max(200),
});

export const updateBoardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export const boardListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(200).optional(),
});
