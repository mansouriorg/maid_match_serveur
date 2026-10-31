import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

// Used as a global guard: every route needs a valid token unless it is marked
// with @Public(). On a public route a valid token is still read, so the route
// can tell who is calling (req.user). A missing or bad token is just ignored.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return (user || null) as TUser;
    }

    const hasUser = Boolean(user);
    if (err || hasUser === false) {
      throw err || new UnauthorizedException();
    }
    return user as TUser;
  }
}
