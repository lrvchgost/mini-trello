import { createZodDto } from 'nestjs-zod';
import { paginationQuerySchema } from '@min-trello/shared';

export class ListCommentsDto extends createZodDto(paginationQuerySchema) {}
