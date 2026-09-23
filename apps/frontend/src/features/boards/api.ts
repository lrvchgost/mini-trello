import {
  boardSchema,
  paginated,
  type Board,
  type BoardListQuery,
  type CreateBoardInput,
  type Paginated,
} from '@min-trello/shared';
import { api } from '@/shared/api/ky-client';

export type BoardListParams = Pick<BoardListQuery, 'page' | 'limit'>;

const paginatedBoardsSchema = paginated(boardSchema);

export async function fetchBoards(params: BoardListParams): Promise<Paginated<Board>> {
  const data = await api.get('boards', { searchParams: params }).json();
  return paginatedBoardsSchema.parse(data);
}

export async function createBoard(input: CreateBoardInput): Promise<Board> {
  const data = await api.post('boards', { json: input }).json();
  return boardSchema.parse(data);
}
