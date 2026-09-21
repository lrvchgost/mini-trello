import type { z } from 'zod';
import type {
  accessTokenResponseSchema,
  authResponseSchema,
  loginSchema,
  registerSchema,
} from '../schemas/auth';

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type AccessTokenResponse = z.infer<typeof accessTokenResponseSchema>;
