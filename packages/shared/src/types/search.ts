import type { z } from 'zod';
import type { searchQuerySchema } from '../schemas/search';

export type SearchQuery = z.infer<typeof searchQuerySchema>;
