import { createZodDto } from 'nestjs-zod';
import { updateColumnSchema } from '@min-trello/shared';

export class UpdateColumnDto extends createZodDto(updateColumnSchema) {}
