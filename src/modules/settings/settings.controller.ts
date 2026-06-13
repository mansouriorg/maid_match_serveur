import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Assure-toi que ce chemin correspond bien à ton dossier auth

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // 🌍 ROUTE PUBLIQUE : Accessible par le client sur la Landing Page et le Wizard
  @Get()
  async getSettings() {
    return this.settingsService.getSettings();
  }

  // 🛡️ ROUTE PROTÉGÉE : Accessible UNIQUEMENT par l'administrateur connecté
  @Patch()
  @UseGuards(JwtAuthGuard)
  async updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(updateSettingsDto);
  }
}