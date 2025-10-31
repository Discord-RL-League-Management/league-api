import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { Request } from 'express';

/**
 * Custom JWT extraction from HttpOnly cookies
 * Falls back to Authorization header for backwards compatibility
 */
const cookieExtractor = (req: Request): string | null => {
  let token: string | null = null;
  if (req && req.cookies) {
    token = req.cookies['auth_token'];
  }

  // Fallback to Authorization header for API clients
  if (!token && req.headers.authorization) {
    const bearerToken = req.headers.authorization.split(' ');
    if (bearerToken.length === 2 && bearerToken[0] === 'Bearer') {
      token = bearerToken[1];
    }
  }

  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwtSecret')!,
    });
  }

  async validate(payload: { sub: string; username: string }) {
    const user = await this.usersService.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user; // Available as req.user in controllers
  }
}
