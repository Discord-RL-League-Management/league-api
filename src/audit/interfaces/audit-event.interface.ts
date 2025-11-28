/**
 * Audit Action - Extensible enum for all audit events
 *
 * Interface Segregation: Clear contract for audit events
 * Open/Closed: Easily extensible for new action types
 */
export enum AuditAction {
  GUILD_ACCESS = 'guild.access',
  ADMIN_CHECK = 'admin.check',
  SETTINGS_VIEW = 'settings.view',
  SETTINGS_UPDATE = 'settings.update',
  RESOURCE_OWNERSHIP_CHECK = 'resource.ownership.check',
  MEMBER_PERMISSION_CHECK = 'member.permission.check',
}

/**
 * Audit Event - Single Responsibility: Define audit event structure
 *
 * Represents a single audit event with all relevant metadata.
 * Extensible through optional metadata field.
 */
export interface AuditEvent {
  userId: string;
  action: AuditAction;
  resource: string;
  result: 'allowed' | 'denied';
  guildId?: string;
  metadata?: Record<string, any>;
}
