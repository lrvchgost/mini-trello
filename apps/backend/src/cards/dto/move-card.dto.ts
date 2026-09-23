import { createZodDto } from 'nestjs-zod';
import { moveCardSchema } from '@min-trello/shared';

export class MoveCardDto extends createZodDto(moveCardSchema) {}
