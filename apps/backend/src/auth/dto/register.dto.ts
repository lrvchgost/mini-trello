import { createZodDto } from 'nestjs-zod';
import { registerSchema } from '@min-trello/shared';

export class RegisterDto extends createZodDto(registerSchema) {}
