import { z } from 'zod';
import { ACTIVITY_ACTIONS } from '../constants';
import { idSchema } from './common';

export const activityActionSchema = z.enum(ACTIVITY_ACTIONS);

export const activityLogSchema = z.object({
  id: idSchema,
  action: z.string().min(1),
  payload: z.unknown().nullable(),
  boardId: idSchema,
  cardId: idSchema.nullable(),
  userId: idSchema,
  createdAt: z.coerce.date(),
});
