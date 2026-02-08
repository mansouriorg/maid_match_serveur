import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Core Database Module
import { PrismaModule } from './prisma/prisma.module';

// Feature Modules
import { ServiceRequestsModule } from './modules/service-requests/service-requests.module';
import { MaidsModule } from './modules/maids/maids.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    // 1. Configuration (Crucial for reading .env files like DATABASE_URL)
    ConfigModule.forRoot({
      isGlobal: true, // Makes config available everywhere without importing it again
    }),

    // 2. Database
    PrismaModule,

    // 3. Application Features
    ServiceRequestsModule,
    MaidsModule,
    AuthModule,
    AdminDashboardModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}