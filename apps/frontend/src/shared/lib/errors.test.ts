import { describe, expect, it } from 'vitest';
import { makeHttpError } from '@/test/http-error';
import { extractApiError, localizeApiError } from './errors';

describe('extractApiError', () => {
  it('extracts code, message and field errors from a validation response', () => {
    const info = extractApiError(
      makeHttpError(422, {
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [{ path: ['email'], message: 'Invalid email' }],
      }),
    );

    expect(info.status).toBe(422);
    expect(info.code).toBe('VALIDATION_ERROR');
    expect(info.message).toBe('Validation failed');
    expect(info.fieldErrors).toEqual({ email: 'Invalid email' });
  });

  it('falls back to a plain Error message', () => {
    expect(extractApiError(new Error('boom'))).toEqual({
      status: null,
      code: null,
      message: 'boom',
      fieldErrors: {},
    });
  });
});

describe('localizeApiError', () => {
  it('localizes known error codes', () => {
    expect(
      localizeApiError({
        status: 409,
        code: 'EMAIL_TAKEN',
        message: 'Email is already registered',
        fieldErrors: {},
      }),
    ).toBe('Этот email уже зарегистрирован');
  });

  it('keeps the server message for unknown codes', () => {
    expect(localizeApiError({ status: 500, code: null, message: 'Boom', fieldErrors: {} })).toBe(
      'Boom',
    );
  });
});
