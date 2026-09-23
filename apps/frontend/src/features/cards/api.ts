import { userSchema, type User } from '@min-trello/shared';
import { api } from '@/shared/api/ky-client';

/** Available assignees — in the ownership model this is just the current user. */
export async function fetchAssignableUsers(): Promise<User[]> {
  const data = await api.get('users').json();
  return userSchema.array().parse(data);
}
