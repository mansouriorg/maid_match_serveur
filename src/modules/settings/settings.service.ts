import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

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

  async updateSettings(data: UpdateSettingsDto) {
    // 1. On crée une copie propre des données validées
    const updatePayload: UpdateSettingsDto = { ...data };

    // 2. Conversion sécurisée du taux horaire (s'il est présent dans la requête)
    if (updatePayload.defaultHourlyRate !== undefined) {
      updatePayload.defaultHourlyRate = parseFloat(
        updatePayload.defaultHourlyRate.toString(),
      );
    }

    // 3. Mise à jour en base de données
    return this.prisma.settings.upsert({
      where: { id: 1 },
      update: updatePayload,
      create: { id: 1, ...updatePayload }, // Fallback au cas où la ligne n'existe pas encore
    });
  }
}
