import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller'; // <-- NOUVEL IMPORT
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AuditController], // <-- AJOUT DU CONTRÔLEUR ICI
  providers: [AuditService],
  exports: [AuditService], // <-- TRÈS IMPORTANT : permet à ServiceRequestsModule de l'utiliser
})
export class AuditModule {}