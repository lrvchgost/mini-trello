import { createZodDto } from 'nestjs-zod';
import { searchQuerySchema } from '@min-trello/shared';

export class SearchQueryDto extends createZodDto(searchQuerySchema) {}
