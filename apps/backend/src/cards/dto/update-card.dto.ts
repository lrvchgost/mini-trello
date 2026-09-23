import { createZodDto } from 'nestjs-zod';
import { updateCardSchema } from '@min-trello/shared';

export class UpdateCardDto extends createZodDto(updateCardSchema) {}
