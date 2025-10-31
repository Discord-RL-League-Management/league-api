/**
 * Shared User interfaces for type safety across the application
 *
 * These interfaces serve as contracts between modules, ensuring
 * consistent data structures and reducing duplication.
 */

export interface User {
  id: string;
  username: string;
  discriminator?: string;
  globalName?: string;
  avatar?: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}

export interface UserCreateDto {
  id: string;
  username: string;
  discriminator?: string;
  globalName?: string;
  avatar?: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface UserUpdateDto {
  username?: string;
  discriminator?: string;
  globalName?: string;
  avatar?: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  globalName?: string;
  avatar?: string;
  email?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface UserStats {
  userId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
}

/**
 * Type for authenticated user from JWT strategy
 * This is what the @CurrentUser() decorator returns
 * Matches the User model from the database
 */
export type AuthenticatedUser = User;
