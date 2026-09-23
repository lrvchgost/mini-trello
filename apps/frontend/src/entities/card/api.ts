import {
  cardDetailSchema,
  cardSchema,
  type Card,
  type CardDetail,
  type CreateCardInput,
  type MoveCardInput,
  type UpdateCardInput,
} from '@min-trello/shared';
import { api } from '@/shared/api/ky-client';

export interface MoveCardResult {
  columnId: string;
  order: number;
}

export async function fetchCard(id: string): Promise<CardDetail> {
  const data = await api.get(`cards/${id}`).json();
  return cardDetailSchema.parse(data);
}

export async function createCard(columnId: string, input: CreateCardInput): Promise<Card> {
  const data = await api.post(`columns/${columnId}/cards`, { json: input }).json();
  return cardSchema.parse(data);
}

export async function updateCard(id: string, input: UpdateCardInput): Promise<Card> {
  const data = await api.patch(`cards/${id}`, { json: input }).json();
  return cardSchema.parse(data);
}

export async function moveCard(id: string, input: MoveCardInput): Promise<MoveCardResult> {
  const data = (await api.patch(`cards/${id}/move`, { json: input }).json()) as MoveCardResult;
  return data;
}

export async function assignCard(id: string, assigneeId: string | null): Promise<Card> {
  const data = await api.patch(`cards/${id}/assignee`, { json: { assigneeId } }).json();
  return cardSchema.parse(data);
}

export async function deleteCard(id: string): Promise<void> {
  await api.delete(`cards/${id}`);
}
