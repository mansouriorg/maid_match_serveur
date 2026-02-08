import { Controller, Get } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin-dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  // GET http://localhost:3000/admin-dashboard/stats
  // Returns: JSON object with counts and recent history
  @Get('stats')
  getStats() {
    return this.adminDashboardService.getDashboardStats();
  }
}