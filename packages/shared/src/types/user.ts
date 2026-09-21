import type { z } from 'zod';
import type { changePasswordSchema, updateProfileSchema, userSchema } from '../schemas/user';

export type User = z.infer<typeof userSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
