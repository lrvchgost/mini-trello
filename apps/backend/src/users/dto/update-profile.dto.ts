import { createZodDto } from 'nestjs-zod';
import { updateProfileSchema } from '@min-trello/shared';

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
