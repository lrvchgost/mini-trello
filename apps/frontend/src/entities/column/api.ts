import { columnSchema, type Column, type CreateColumnInput } from '@min-trello/shared';
import { api } from '@/shared/api/ky-client';

export async function createColumn(boardId: string, input: CreateColumnInput): Promise<Column> {
  const data = await api.post(`boards/${boardId}/columns`, { json: input }).json();
  return columnSchema.parse(data);
}
