export interface UserGuild {
  id: string;
  name: string;
  icon?: string;
  isMember: boolean;
  isAdmin: boolean;
  roles: string[];
}

