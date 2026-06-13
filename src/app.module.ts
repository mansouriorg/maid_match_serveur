import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'; // <-- Nouveaux imports

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Core Database Module
import { PrismaModule } from './prisma/prisma.module';

// Feature Modules
import { ServiceRequestsModule } from './modules/service-requests/service-requests.module';
import { MaidsModule } from './modules/maids/maids.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    // 1. Configuration (Crucial for reading .env files like DATABASE_URL)
    ConfigModule.forRoot({
      isGlobal: true, // Makes config available everywhere without importing it again
    }),

    // 2. Sécurité : Rate Limiting Global (Protection anti-bruteforce/DDoS)
    ThrottlerModule.forRoot([{
      ttl: 60000, // Temps de la fenêtre en millisecondes (ici 60 secondes)
      limit: 100, // Nombre max de requêtes autorisées par IP dans cette fenêtre
    }]),

    // 3. Database
    PrismaModule,

    // 4. Application Features
    ServiceRequestsModule,
    MaidsModule,
    AuthModule,
    SettingsModule,
    NotificationsModule,
    AdminModule,
    AuditModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Activation du bouclier (ThrottlerGuard) sur absolument toutes les routes de l'API
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}