import { Injectable } from '@nestjs/common';
import { IAuditProvider } from '../../common/interfaces/audit-provider.interface';
import { AuditLogService } from '../services/audit-log.service';
import type { AuditEvent } from '../interfaces/audit-event.interface';
import type { Request } from 'express';

/**
 * AuditProviderAdapter - Adapter implementing IAuditProvider
 *
 * Implements the IAuditProvider interface using AuditLogService.
 * This adapter enables dependency inversion by allowing CommonModule to depend
 * on the interface rather than concrete services.
 */
@Injectable()
export class AuditProviderAdapter implements IAuditProvider {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Log an admin action event
   * Delegates to AuditLogService.logAdminAction()
   */
  async logAdminAction(event: AuditEvent, request: Request): Promise<void> {
    return this.auditLogService.logAdminAction(event, request);
  }
}
