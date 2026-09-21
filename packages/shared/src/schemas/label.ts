import { z } from 'zod';
import { DEFAULT_LABEL_COLOR, HEX_COLOR_REGEX } from '../constants';
import { idSchema } from './common';

export const labelSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(50),
  color: z.string().regex(HEX_COLOR_REGEX),
  boardId: idSchema,
});

export const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(HEX_COLOR_REGEX).default(DEFAULT_LABEL_COLOR),
});
