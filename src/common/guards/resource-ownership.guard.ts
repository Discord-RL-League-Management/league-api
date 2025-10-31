import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceUserId = request.params.userId || request.params.id;

    // If authenticated via bot, allow everything
    if (user.type === 'bot') {
      return true;
    }

    // If authenticated via JWT, check ownership
    if (user.id !== resourceUserId) {
      throw new ForbiddenException('You can only access your own resources');
    }

    return true;
  }
}
