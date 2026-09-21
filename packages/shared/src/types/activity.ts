import type { z } from 'zod';
import type { activityLogSchema } from '../schemas/activity';

export type ActivityLog = z.infer<typeof activityLogSchema>;
