import { Inject, Injectable } from '@nestjs/common';
import {
  DASHBOARD_REPOSITORY_TOKEN,
  type DashboardStats,
  type IDashboardRepository,
} from './repositories/dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DASHBOARD_REPOSITORY_TOKEN)
    private readonly dashboardRepo: IDashboardRepository,
  ) {}

  getStats(ownerId: string): Promise<DashboardStats> {
    return this.dashboardRepo.getStats(ownerId);
  }
}
