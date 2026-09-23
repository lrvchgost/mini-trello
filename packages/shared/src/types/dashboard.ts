import type { z } from 'zod';
import type { cardsByStatusSchema, dashboardStatsSchema } from '../schemas/dashboard';

export type CardsByStatus = z.infer<typeof cardsByStatusSchema>;
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
