/**
 * Settings Interface
 * Type definitions for settings
 */

export interface Settings {
  id: string;
  ownerType: string;
  ownerId: string;
  settings: Record<string, any>;
  schemaVersion: number;
  configVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}
