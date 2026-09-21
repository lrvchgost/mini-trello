import { z } from 'zod';
import { PRIORITIES } from '../constants';
import { idSchema } from './common';
import { commentSchema } from './comment';
import { labelSchema } from './label';
import { userSchema } from './user';

export const prioritySchema = z.enum(PRIORITIES);

export const cardSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(20_000).nullable(),
  priority: prioritySchema,
  deadline: z.coerce.date().nullable(),
  order: z.number().int().min(0),
  columnId: idSchema,
  assigneeId: idSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const cardDetailSchema = cardSchema.extend({
  assignee: userSchema.nullable(),
  labels: z.array(labelSchema),
  comments: z.array(commentSchema).optional(),
});

export const createCardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(20_000).optional(),
  priority: prioritySchema.default('medium'),
  deadline: z.coerce.date().nullable().optional(),
});

export const updateCardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(20_000).nullable().optional(),
  priority: prioritySchema.optional(),
  deadline: z.coerce.date().nullable().optional(),
  expectedUpdatedAt: z.coerce.date().optional(),
});

export const moveCardSchema = z.object({
  columnId: idSchema,
  order: z.number().int().min(0),
});

export const assignCardSchema = z.object({
  assigneeId: idSchema.nullable(),
});
