import { createZodDto } from 'nestjs-zod';
import { addLabelSchema } from '@min-trello/shared';

export class AddLabelDto extends createZodDto(addLabelSchema) {}
