import { z } from 'zod';
import { cardSchema } from './card';
import { idSchema } from './common';

export const columnSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(100),
  isDone: z.boolean(),
  order: z.number().int().min(0),
  boardId: idSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const columnWithCardsSchema = columnSchema.extend({
  cards: z.array(cardSchema),
});

export const createColumnSchema = z.object({
  title: z.string().min(1).max(100),
});

export const updateColumnSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  isDone: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});
