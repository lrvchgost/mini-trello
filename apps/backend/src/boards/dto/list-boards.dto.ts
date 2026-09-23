import { createZodDto } from 'nestjs-zod';
import { boardListQuerySchema } from '@min-trello/shared';

export class ListBoardsDto extends createZodDto(boardListQuerySchema) {}
