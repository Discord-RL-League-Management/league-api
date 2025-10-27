export interface AccessInfo {
  isMember: boolean;
  isAdmin: boolean;
  permissions: string[];
}

export interface RoleConfig {
  id: string;
  name: string;
}
