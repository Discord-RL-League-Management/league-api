import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    // Handle JWT-specific errors
    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException('Token has expired');
    }
    
    if (info instanceof JsonWebTokenError) {
      throw new UnauthorizedException('Invalid token');
    }

    // Handle other authentication errors
    if (err || !user) {
      throw new UnauthorizedException('Authentication required');
    }

    return user;
  }
}
