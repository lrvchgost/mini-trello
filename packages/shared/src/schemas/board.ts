import { z } from 'zod';
import { columnWithCardsSchema } from './column';
import { idSchema } from './common';

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

export const createBoardSchema = z.object({
  title: z.string().min(1).max(200),
});

export const updateBoardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});
