import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants';
import { userSchema } from './user';

export const emailSchema = z.string().email();

export const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(100),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string().min(1),
});

export const accessTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
});
