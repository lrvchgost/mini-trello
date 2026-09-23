import { createZodDto } from 'nestjs-zod';
import { createCardSchema } from '@min-trello/shared';

export class CreateCardDto extends createZodDto(createCardSchema) {}
