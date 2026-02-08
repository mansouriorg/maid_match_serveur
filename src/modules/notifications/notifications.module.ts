import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Global() // <--- Global: So you can use it in ServiceRequests without importing it
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}