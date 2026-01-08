import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditLogService } from '../../infrastructure/audit-log/services/audit-log.service';
import { RequestContextService } from '../request-context/services/request-context/request-context.service';
import { LogSanitizer } from '../utils/log-sanitizer';
import type { AuthenticatedUser } from '../interfaces/user.interface';
import type { CreateAuditLogInput } from '../../infrastructure/audit-log/interfaces/audit-log.interface';

/**
 * AuditLogInterceptor - Single Responsibility: Audit logging for state-changing HTTP requests
 *
 * Intercepts all POST, PUT, PATCH, DELETE requests and logs audit entries.
 * Follows NestJS interceptor pattern: https://docs.nestjs.com/interceptors
 *
 * Uses fire-and-forget pattern to avoid blocking requests.
 * Sanitizes sensitive data before logging.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly requestContextService: RequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser | { type: 'bot' } }>();
    const response = context.switchToHttp().getResponse<Response>();

    // Filter only state-changing methods (following NestJS interceptor pattern)
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return next.handle(); // Pass through non-state-changing methods
    }

    // Extract audit data before request processing
    const auditData = this.extractAuditData(request);

    // Use tap() operator for side effects (logging) without modifying response
    // Reference: NestJS Interceptors - Using RxJS Operators
    // https://docs.nestjs.com/interceptors#aspect-interception
    return next.handle().pipe(
      tap({
        next: () => {
          // Response status is available after next.handle() completes
          auditData.responseStatus = response.statusCode;
          // Fire-and-forget async logging (doesn't block request)
          void this.auditLogService.logAuditEntry(auditData).catch((err) => {
            this.logger.error('Failed to log audit entry', err);
          });
        },
        error: () => {
          // Log audit entry even when request fails
          auditData.responseStatus = response.statusCode ?? 500;
          void this.auditLogService.logAuditEntry(auditData).catch((err) => {
            this.logger.error('Failed to log audit entry', err);
          });
        },
      }),
      catchError((error: unknown) => {
        // Re-throw error to maintain request flow (don't block on logging errors)
        return throwError(() => error) as Observable<unknown>;
      }),
    );
  }

  /**
   * Extract audit data from request
   * Single Responsibility: Extract and normalize audit metadata
   */
  private extractAuditData(
    request: Request & { user?: AuthenticatedUser | { type: 'bot' } },
  ): CreateAuditLogInput {
    const user = request.user;
    const method = request.method;
    const endpoint = request.url.split('?')[0]; // Remove query string
    const ipAddress = this.requestContextService.getIpAddress(request);
    const userAgent = this.requestContextService.getUserAgent(request);

    // Extract user/bot information
    let userId: string | undefined;
    let botId: string | undefined;

    if (user) {
      if ('type' in user && user.type === 'bot') {
        botId = 'discord-bot'; // Bot identifier
      } else if ('id' in user) {
        userId = user.id;
      }
    }

    // Identify resource type and ID from URL pattern
    const { resourceType, resourceId } = this.identifyResource(request);

    // Normalize action name from method and endpoint
    const action = this.normalizeAction(method, endpoint);

    // Sanitize request body
    const sanitizedBody = request.body
      ? (LogSanitizer.sanitizeObject(request.body) as Record<string, unknown>)
      : undefined;

    return {
      userId,
      botId,
      ipAddress,
      userAgent,
      method,
      endpoint,
      action,
      resourceType,
      resourceId,
      requestBody: sanitizedBody,
    };
  }

  /**
   * Identify resource type and ID from URL pattern
   * Single Responsibility: Extract resource metadata from request URL
   */
  private identifyResource(request: Request): {
    resourceType?: string;
    resourceId?: string;
  } {
    const url = request.url.split('?')[0]; // Remove query string
    const params = request.params;

    // Try pattern matching first
    const patternResult = this.matchResourcePattern(url, params);
    if (patternResult) {
      return patternResult;
    }

    // Fallback to common params
    const paramResult = this.extractFromCommonParams(params);
    if (paramResult) {
      return paramResult;
    }

    // No resource identified
    return {};
  }

  /**
   * Match resource type and ID from URL patterns
   * Single Responsibility: Pattern-based resource extraction
   */
  private matchResourcePattern(
    url: string,
    params: Record<string, string>,
  ): { resourceType?: string; resourceId?: string } | null {
    // Common resource patterns - nested routes checked first (more specific)
    const resourcePatterns = [
      {
        pattern: /^\/api\/leagues\/([^/]+)\/teams\/([^/]+)/,
        type: 'team',
        paramKey: 'teamId',
      },
      {
        pattern: /^\/api\/leagues\/([^/]+)\/members\/([^/]+)/,
        type: 'leagueMember',
        paramKey: 'memberId',
      },
      { pattern: /^\/api\/leagues\/([^/]+)/, type: 'league', paramKey: 'id' },
      { pattern: /^\/api\/teams\/([^/]+)/, type: 'team', paramKey: 'id' },
      { pattern: /^\/api\/players\/([^/]+)/, type: 'player', paramKey: 'id' },
      { pattern: /^\/api\/users\/([^/]+)/, type: 'user', paramKey: 'id' },
      { pattern: /^\/api\/trackers\/([^/]+)/, type: 'tracker', paramKey: 'id' },
      { pattern: /^\/api\/guilds\/([^/]+)/, type: 'guild', paramKey: 'id' },
      {
        pattern: /^\/api\/organizations\/([^/]+)/,
        type: 'organization',
        paramKey: 'id',
      },
      { pattern: /^\/api\/matches\/([^/]+)/, type: 'match', paramKey: 'id' },
      {
        pattern: /^\/api\/tournaments\/([^/]+)/,
        type: 'tournament',
        paramKey: 'id',
      },
    ];

    for (const { pattern, type, paramKey } of resourcePatterns) {
      const match = url.match(pattern);
      if (match) {
        const resourceId = params[paramKey] || match[1] || match[2];
        return { resourceType: type, resourceId };
      }
    }

    return null;
  }

  /**
   * Extract resource type and ID from common parameter names
   * Single Responsibility: Parameter-based resource extraction
   */
  private extractFromCommonParams(
    params: Record<string, string>,
  ): { resourceType?: string; resourceId?: string } | null {
    const commonParamKeys = [
      'id',
      'leagueId',
      'teamId',
      'playerId',
      'userId',
      'trackerId',
      'guildId',
      'organizationId',
      'matchId',
      'tournamentId',
    ];

    for (const key of commonParamKeys) {
      if (params[key]) {
        // Infer resource type from param key
        const resourceType = key
          .replace('Id', '')
          .replace(/^./, (c) => c.toUpperCase());
        return {
          resourceType: resourceType.toLowerCase(),
          resourceId: params[key],
        };
      }
    }

    return null;
  }

  /**
   * Normalize action name from HTTP method and endpoint
   * Single Responsibility: Create normalized action names
   */
  private normalizeAction(method: string, endpoint: string): string {
    // Extract base resource from endpoint
    const parts = endpoint.split('/').filter(Boolean);
    const resource = parts[parts.length - 1] || 'unknown';

    // Map HTTP methods to actions
    const actionMap: Record<string, string> = {
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };

    const baseAction = actionMap[method] || method.toLowerCase();

    // Special cases for nested resources
    if (endpoint.includes('/teams/') && method === 'POST') {
      return 'create_team';
    }
    if (endpoint.includes('/members/') && method === 'POST') {
      return 'add_member';
    }
    if (endpoint.includes('/members/') && method === 'DELETE') {
      return 'remove_member';
    }

    return `${baseAction}_${resource}`;
  }
}
