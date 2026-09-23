import { createZodDto } from 'nestjs-zod';
import { assignCardSchema } from '@min-trello/shared';

export class AssignCardDto extends createZodDto(assignCardSchema) {}
