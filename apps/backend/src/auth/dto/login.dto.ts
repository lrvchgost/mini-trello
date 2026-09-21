import { createZodDto } from 'nestjs-zod';
import { loginSchema } from '@min-trello/shared';

export class LoginDto extends createZodDto(loginSchema) {}
