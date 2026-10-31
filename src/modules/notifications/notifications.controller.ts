// src/modules/notifications/notifications.controller.ts
import { Controller, Get, Patch, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Récupérer toutes les notifications (historique)
  @Get()
  async getAll() {
    return this.notificationsService.findAll();
  }

  // Marquer TOUTES les notifications comme lues
  @Patch('mark-all-read')
  async markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }

  // Marquer UNE SEULE notification comme lue (au cas où tu en aurais besoin plus tard)
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(Number(id));
  }
}
