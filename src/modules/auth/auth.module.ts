import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../../prisma/prisma.module'; // ⚠️ CRUCIAL: Ajout de Prisma

@Module({
  imports: [
    PrismaModule, // Sans ça, ton AuthService plante !
    PassportModule,
    ConfigModule, // Ajout de ConfigModule ici pour qu'il soit disponible
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // On cherche 'JWT_SECRET' dans le .env, avec un fallback sécurisé
        secret: configService.get<string>('JWT_SECRET') || 'MAIDMATCH_SECRET_KEY_2026_VERY_SECURE', 
        signOptions: { expiresIn: '1d' }, 
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}