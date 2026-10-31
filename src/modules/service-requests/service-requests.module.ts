import { Module } from '@nestjs/common';
import { ServiceRequestsService } from './service-requests.service';
import { ServiceRequestsController } from './service-requests.controller';

// Importation des modules externes nécessaires au fonctionnement du service
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PrismaModule, // Requis pour lire/écrire dans la base de données
    NotificationsModule, // Requis pour alerter l'admin des nouvelles missions
    AuditModule, // Requis pour tracer toutes les actions (Le correctif de l'erreur !)
  ],
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsService],
})
export class ServiceRequestsModule {}
