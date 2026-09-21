import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants';
import { idSchema } from './common';

export const userSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  name: z.string().min(1).max(100),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});
