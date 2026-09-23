export const BOARD_ROOM_PREFIX = 'board:';

export function boardRoom(boardId: string): string {
  return `${BOARD_ROOM_PREFIX}${boardId}`;
}
