import { ZodError } from 'zod';
import { clientEnvSchema, serverEnvSchema, type ClientEnv, type ServerEnv } from './schema';

export type EnvSource = Record<string, string | undefined>;

function processEnv(): EnvSource {
  return typeof process !== 'undefined' && process.env ? process.env : {};
}

function formatError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

export function parseServerEnv(env: EnvSource = processEnv()): ServerEnv {
  const result = serverEnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid server environment: ${formatError(result.error)}`);
  }
  return result.data;
}

export function parseClientEnv(env: EnvSource = processEnv()): ClientEnv {
  const result = clientEnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid client environment: ${formatError(result.error)}`);
  }
  return result.data;
}
