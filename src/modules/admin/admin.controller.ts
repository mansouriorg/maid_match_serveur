import { Controller, Patch, Body, Request } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // The password that changes is the one of the logged-in admin
  // (the id comes from the token), not a fixed account.
  @Patch('change-password')
  async changePassword(
    @Request() req: { user: { userId: number } },
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.adminService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword,
    );
  }
}
