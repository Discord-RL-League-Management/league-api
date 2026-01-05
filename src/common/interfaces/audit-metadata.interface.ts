/**
 * AuditMetadata - DEPRECATED: No longer used
 *
 * This interface was previously used for interceptor-based audit logging.
 * Audit logging now happens directly in authorization services and guards.
 *
 * @deprecated This interface is kept for reference only and may be removed in a future version.
 */
export interface AuditMetadata {
  action: string; // e.g., 'admin.check', 'resource.ownership.check'
  guardType: string; // e.g., 'SystemAdminGuard', 'ResourceOwnershipGuard'
  entityType?: string; // Optional: 'admin', 'permission', 'guild'
  guildId?: string; // Optional: guild ID for guild-related actions
  metadata?: Record<string, unknown>; // Optional: Additional metadata for audit logging
}

// Extend Express Request type to include audit metadata (DEPRECATED)
/**
 * @deprecated This module augmentation is no longer used. Audit logging happens directly in services.
 */
declare module 'express' {
  interface Request {
    _auditMetadata?: AuditMetadata;
  }
}
