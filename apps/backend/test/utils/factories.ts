import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { TestSession } from './auth';

export interface BoardDto {
  id: string;
  title: string;
  ownerId: string;
}

export interface ColumnDto {
  id: string;
  boardId: string;
  title: string;
  order: number;
  isDone: boolean;
}

export interface CardDto {
  id: string;
  columnId: string;
  title: string;
  order: number;
  priority: string;
}

export interface LabelDto {
  id: string;
  boardId: string;
  name: string;
  color: string;
}

export interface CommentDto {
  id: string;
  cardId: string;
  content: string;
  authorId: string;
  createdAt: string;
}

export interface CreateCardBody {
  title: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string | null;
  description?: string | null;
  [key: string]: unknown;
}

export async function createBoard(
  app: INestApplication,
  session: TestSession,
  title: string,
): Promise<BoardDto> {
  const response = await request(app.getHttpServer())
    .post('/api/boards')
    .set('Authorization', `Bearer ${session.token}`)
    .send({ title })
    .expect(201);

  return response.body as BoardDto;
}

export async function createColumn(
  app: INestApplication,
  session: TestSession,
  boardId: string,
  title: string,
): Promise<ColumnDto> {
  const response = await request(app.getHttpServer())
    .post(`/api/boards/${boardId}/columns`)
    .set('Authorization', `Bearer ${session.token}`)
    .send({ title })
    .expect(201);

  return response.body as ColumnDto;
}

export async function createCard(
  app: INestApplication,
  session: TestSession,
  columnId: string,
  body: string | CreateCardBody,
): Promise<CardDto> {
  const payload = typeof body === 'string' ? { title: body } : body;
  const response = await request(app.getHttpServer())
    .post(`/api/columns/${columnId}/cards`)
    .set('Authorization', `Bearer ${session.token}`)
    .send(payload)
    .expect(201);

  return response.body as CardDto;
}

export async function createLabel(
  app: INestApplication,
  session: TestSession,
  boardId: string,
  name: string,
  color?: string,
): Promise<LabelDto> {
  const response = await request(app.getHttpServer())
    .post(`/api/boards/${boardId}/labels`)
    .set('Authorization', `Bearer ${session.token}`)
    .send(color ? { name, color } : { name })
    .expect(201);

  return response.body as LabelDto;
}

export async function createComment(
  app: INestApplication,
  session: TestSession,
  cardId: string,
  content: string,
): Promise<CommentDto> {
  const response = await request(app.getHttpServer())
    .post(`/api/cards/${cardId}/comments`)
    .set('Authorization', `Bearer ${session.token}`)
    .send({ content })
    .expect(201);

  return response.body as CommentDto;
}
