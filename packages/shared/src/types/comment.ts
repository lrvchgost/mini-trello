import type { z } from 'zod';
import type { commentSchema, createCommentSchema } from '../schemas/comment';

export type Comment = z.infer<typeof commentSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
