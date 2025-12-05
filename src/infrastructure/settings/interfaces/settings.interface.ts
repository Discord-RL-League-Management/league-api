/**
 * Settings Interface
 * Type definitions for settings
 */

export interface Settings {
  id: string;
  ownerType: string;
  ownerId: string;
  settings: Record<string, unknown>;
  schemaVersion: number;
  configVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}
