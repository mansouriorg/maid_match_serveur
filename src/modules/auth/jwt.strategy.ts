import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      // On indique qu'on va envoyer le token dans le Header d'autorisation (Bearer Token)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // ⚠️ On lit la variable d'environnement, avec le MÊME fallback que dans AuthModule
      secretOrKey: configService.get<string>('JWT_SECRET') || 'MAIDMATCH_SECRET_KEY_2026_VERY_SECURE', 
    });
  }

  async validate(payload: any) {
    // Cette méthode s'exécute automatiquement si le token est valide.
    // Elle attache ces informations à l'objet "request" (accessible via req.user)
    return { userId: payload.sub, email: payload.email };
  }
}