import { Controller, Get, Patch, Body, Request } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Public } from '../auth/public.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // PUBLIC for the booking site, which only needs the hourly rate.
  // With a valid admin token the full settings are returned.
  @Public()
  @Get()
  async getSettings(@Request() req: { user?: unknown }) {
    const settings = await this.settingsService.getSettings();
    if (req.user) {
      return settings;
    }
    return { defaultHourlyRate: settings.defaultHourlyRate };
  }

  // Needs an admin token (every route does unless it is marked @Public).
  @Patch()
  async updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(updateSettingsDto);
  }
}
