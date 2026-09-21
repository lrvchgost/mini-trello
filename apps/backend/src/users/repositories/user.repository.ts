import type { User } from '@min-trello/shared';

export const USER_REPOSITORY_TOKEN = 'USER_REPOSITORY';

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(): Promise<User[]>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: { name?: string }): Promise<User>;
  updatePassword(id: string, password: string): Promise<void>;
}
