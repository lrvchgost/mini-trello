import { createZodDto } from 'nestjs-zod';
import { createColumnSchema } from '@min-trello/shared';

export class CreateColumnDto extends createZodDto(createColumnSchema) {}
