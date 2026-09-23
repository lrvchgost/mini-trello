import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { DashboardService } from './dashboard.service';
import type { DashboardStats } from './repositories/dashboard.repository';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  stats(@CurrentUser() user: AuthenticatedUser): Promise<DashboardStats> {
    return this.dashboardService.getStats(user.id);
  }
}
