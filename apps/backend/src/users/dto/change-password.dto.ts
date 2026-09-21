import { createZodDto } from 'nestjs-zod';
import { changePasswordSchema } from '@min-trello/shared';

export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
