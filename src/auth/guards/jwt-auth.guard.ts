import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Public routes bypass authentication to allow OAuth callbacks and health checks without tokens
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = AuthenticatedUser>(
    err: Error | null,
    user: TUser | null,
    info: TokenExpiredError | JsonWebTokenError | Error | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: ExecutionContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _status?: number,
  ): TUser {
    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException('Token has expired');
    }

    if (info instanceof JsonWebTokenError) {
      throw new UnauthorizedException('Invalid token');
    }

    if (err || !user) {
      throw new UnauthorizedException('Authentication required');
    }

    return user;
  }
}
