import { createZodDto } from 'nestjs-zod';
import { paginationQuerySchema } from '@min-trello/shared';

export class ListActivityDto extends createZodDto(paginationQuerySchema) {}
