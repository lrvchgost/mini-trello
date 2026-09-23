import { createZodDto } from 'nestjs-zod';
import { createBoardSchema } from '@min-trello/shared';

export class CreateBoardDto extends createZodDto(createBoardSchema) {}
