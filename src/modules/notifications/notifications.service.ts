// src/modules/notifications/notifications.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '../../prisma/prisma.service'; // Assure-toi que ce chemin est correct

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // 0. Injection du Gateway (temps réel) ET de Prisma (base de données)
  constructor(
    private readonly notificationsGateway: NotificationsGateway,
    private readonly prisma: PrismaService 
  ) {}

  // 1. Send Email (Mock implementation)
  async sendEmail(to: string, subject: string, content: string) {
    // In the future, install 'nodemailer' and put real logic here
    this.logger.log(`[EMAIL SENT] To: ${to} | Subject: ${subject} | Content: ${content}`);
    return { success: true };
  }

  // 2. Send SMS (Mock implementation)
  async sendSms(phoneNumber: string, message: string) {
    // In the future, install 'twilio' and put real logic here
    this.logger.log(`[SMS SENT] To: ${phoneNumber} | Message: ${message}`);
    return { success: true };
  }

  // 3. Notify Admin about new request (Mise à jour : BDD + Email + WebSocket)
  async notifyAdminNewRequest(serviceRequest: any) {
    const customerName = serviceRequest.customerName || 'Un client';
    const cleaningType = serviceRequest.cleaningType || 'nettoyage';
    
    const title = 'Nouvelle demande de nettoyage !';
    const message = `${customerName} a demandé une intervention (${cleaningType}).`;

    // 3.1 Sauvegarde dans la base de données PostgreSQL via Prisma
    const savedNotification = await this.prisma.notification.create({
      data: {
        title,
        message,
        isRead: false,
        serviceRequestId: serviceRequest.id, // <-- AJOUT ICI : Lien avec l'ID de la demande
      },
    });
    
    // 3.2 Déclencher l'alerte par Email (Mock)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    await this.sendEmail(
      adminEmail, 
      title, 
      `${message} Check dashboard.`
    );

    // 3.3 Déclencher l'alerte en temps réel sur le frontend (WebSocket)
    // On diffuse la notification sauvegardée (avec son vrai ID) + les données de la requête
    this.notificationsGateway.server.emit('new-intervention', {
      ...savedNotification, 
      data: serviceRequest, 
    });
  }

  // 4. Récupérer l'historique des notifications (pour le tableau de bord)
  async findAll() {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50, // On limite aux 50 dernières pour les performances
    });
  }

  // 5. Tout marquer comme lu (quand l'admin ouvre le menu)
  async markAllAsRead() {
    return this.prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
  }

  // 6. Marquer une seule notification comme lue
  async markAsRead(id: number) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }
}