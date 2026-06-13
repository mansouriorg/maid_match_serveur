import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    // Cherche la ligne d'ID 1. Si elle n'existe pas, Prisma va la créer avec les valeurs par défaut.
    let settings = await this.prisma.settings.findUnique({ where: { id: 1 } });
    
    if (!settings) {
      settings = await this.prisma.settings.create({ data: { id: 1 } });
    }
    return settings;
  }

  async updateSettings(data: any) {
    // Assure-toi que defaultHourlyRate est bien sauvegardé comme un nombre (Float)
    if (data.defaultHourlyRate) {
      data.defaultHourlyRate = parseFloat(data.defaultHourlyRate);
    }

    return this.prisma.settings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data }, // Fallback au cas où
    });
  }
}