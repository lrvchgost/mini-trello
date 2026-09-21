import type { User } from '@min-trello/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
}
