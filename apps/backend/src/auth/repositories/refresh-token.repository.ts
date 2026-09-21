export const REFRESH_TOKEN_REPOSITORY_TOKEN = 'REFRESH_TOKEN_REPOSITORY';

export interface RefreshTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface IRefreshTokenRepository {
  create(data: { tokenHash: string; userId: string; expiresAt: Date }): Promise<RefreshTokenRecord>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  removeByHash(tokenHash: string): Promise<void>;
  deleteExpired(now?: Date): Promise<number>;
}
