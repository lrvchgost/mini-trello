import { createZodDto } from 'nestjs-zod';
import { createCommentSchema } from '@min-trello/shared';

export class CreateCommentDto extends createZodDto(createCommentSchema) {}
