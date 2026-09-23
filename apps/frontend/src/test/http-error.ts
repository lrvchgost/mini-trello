import { HTTPError } from 'ky';

/** Builds an HTTPError carrying a pre-parsed `data` body (ky normally fills it in afterResponse). */
export function makeHttpError(status: number, data: unknown): HTTPError {
  const error = Object.create(HTTPError.prototype) as HTTPError;
  Object.assign(error, { response: { status, statusText: '' }, data });
  return error;
}
