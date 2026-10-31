import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  // Fonction universelle pour écrire un log
  async logAction(
    action: string,
    entity: string,
    entityId: number,
    details: string,
    adminId?: number, // Identifiant de l'admin connecté
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          entity,
          entityId,
          details,
          adminId,
        },
      });
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de l'Audit Log:", error);
      // On ne jette pas l'erreur pour ne pas bloquer l'action principale de l'utilisateur
    }
  }

  // Pour afficher l'historique plus tard sur le frontend
  async getLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // On récupère les 100 dernières actions
      include: {
        admin: { select: { email: true } }, // On inclut l'email de l'admin
      },
    });
  }
}
