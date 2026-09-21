import { z } from 'zod';
import { idSchema } from './common';
import { userSchema } from './user';

export const commentSchema = z.object({
  id: idSchema,
  content: z.string().min(1).max(5000),
  cardId: idSchema,
  authorId: idSchema,
  author: userSchema.optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});
