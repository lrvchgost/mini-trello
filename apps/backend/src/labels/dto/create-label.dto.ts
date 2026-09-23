import { createZodDto } from 'nestjs-zod';
import { createLabelSchema } from '@min-trello/shared';

export class CreateLabelDto extends createZodDto(createLabelSchema) {}
