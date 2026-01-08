import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * RequestContextService - Single Responsibility: Extract request metadata
 *
 * Separates request metadata extraction from business logic.
 * Provides consistent way to get IP, User-Agent, and request ID.
 */
@Injectable()
export class RequestContextService {
  /**
   * Get client IP address from request
   * Single Responsibility: Extract IP address
   */
  getIpAddress(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  /**
   * Get user agent from request
   * Single Responsibility: Extract user agent
   */
  getUserAgent(request: Request): string {
    const userAgent = request.headers['user-agent'];
    if (Array.isArray(userAgent) && userAgent.length > 0) {
      const first: unknown = userAgent[0];
      return typeof first === 'string' ? first : 'unknown';
    }
    return typeof userAgent === 'string' ? userAgent : 'unknown';
  }

  /**
   * Get or create request ID
   * Single Responsibility: Generate unique request identifier
   */
  getRequestId(request: Request & { requestId?: string }): string {
    if (!request.requestId) {
      request.requestId = uuidv4();
    }
    return request.requestId;
  }
}
