import type { InjectionToken } from '@nestjs/common';
import type { Request } from 'express';
import { AuditEvent } from '../../audit/interfaces/audit-event.interface';

/**
 * IAuditProvider - Interface for audit logging operations
 *
 * Abstracts AuditLogService to enable dependency inversion.
 * This interface allows CommonModule to depend on abstractions rather than
 * concrete implementations, breaking cross-boundary coupling.
 */
export interface IAuditProvider {
  /**
   * Log an admin action event
   * @param event - Audit event data
   * @param request - Express request object for additional context
   */
  logAdminAction(event: AuditEvent, request: Request): Promise<void>;
}

export const IAuditProvider = Symbol(
  'IAuditProvider',
) as InjectionToken<IAuditProvider>;
