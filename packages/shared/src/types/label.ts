import type { z } from 'zod';
import type { createLabelSchema, labelSchema } from '../schemas/label';

export type Label = z.infer<typeof labelSchema>;
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
