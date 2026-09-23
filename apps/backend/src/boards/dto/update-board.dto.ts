import { createZodDto } from 'nestjs-zod';
import { updateBoardSchema } from '@min-trello/shared';

export class UpdateBoardDto extends createZodDto(updateBoardSchema) {}
