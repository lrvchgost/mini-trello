import {
  cardDetailSchema,
  labelSchema,
  type CardDetail,
  type CreateLabelInput,
  type Label,
} from '@min-trello/shared';
import { api } from '@/shared/api/ky-client';

export async function fetchBoardLabels(boardId: string): Promise<Label[]> {
  const data = await api.get(`boards/${boardId}/labels`).json();
  return labelSchema.array().parse(data);
}

export async function createLabel(boardId: string, input: CreateLabelInput): Promise<Label> {
  const data = await api.post(`boards/${boardId}/labels`, { json: input }).json();
  return labelSchema.parse(data);
}

export async function attachLabel(cardId: string, labelId: string): Promise<CardDetail> {
  const data = await api.post(`cards/${cardId}/labels`, { json: { labelId } }).json();
  return cardDetailSchema.parse(data);
}

export async function detachLabel(cardId: string, labelId: string): Promise<void> {
  await api.delete(`cards/${cardId}/labels/${labelId}`);
}
