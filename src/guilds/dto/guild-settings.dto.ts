import { IsOptional, IsString, IsBoolean, IsArray, IsEnum, ValidateNested, Matches, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base role configuration with Discord ID validation
 */
export class RoleConfigDto {
  @ApiPropertyOptional({
    description: 'Discord role ID (17-20 digit snowflake)',
    example: '123456789012345678',
  })
  @IsString()
  @Matches(/^\d{17,20}$/, { message: 'Role ID must be a valid Discord snowflake (17-20 digits)' })
  id: string;

  @ApiPropertyOptional({
    description: 'Role name',
    example: 'Admin',
  })
  @IsString()
  @Length(1, 100, { message: 'Role name must be between 1 and 100 characters' })
  name: string;
}

/**
 * Base channel configuration with Discord ID validation
 */
export class ChannelConfigDto {
  @ApiPropertyOptional({
    description: 'Discord channel ID (17-20 digit snowflake)',
    example: '123456789012345678',
  })
  @IsString()
  @Matches(/^\d{17,20}$/, { message: 'Channel ID must be a valid Discord snowflake (17-20 digits)' })
  id: string;

  @ApiPropertyOptional({
    description: 'Channel name',
    example: 'general',
  })
  @IsString()
  @Length(1, 100, { message: 'Channel name must be between 1 and 100 characters' })
  name: string;
}

/**
 * Roles configuration - supports multiple roles per type (array of objects)
 * This is the best practice approach: supports multiple admin roles and includes metadata
 */
export class RolesConfigDto {
  @ApiPropertyOptional({ 
    type: [RoleConfigDto],
    description: 'Admin roles - array of role objects',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleConfigDto)
  admin?: RoleConfigDto[];

  @ApiPropertyOptional({ type: [RoleConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleConfigDto)
  moderator?: RoleConfigDto[];

  @ApiPropertyOptional({ type: [RoleConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleConfigDto)
  member?: RoleConfigDto[];

  @ApiPropertyOptional({ type: [RoleConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleConfigDto)
  league_manager?: RoleConfigDto[];

  @ApiPropertyOptional({ type: [RoleConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleConfigDto)
  tournament_manager?: RoleConfigDto[];
}

/**
 * Channels configuration - single channel per type
 */
export class ChannelsConfigDto {
  @ApiPropertyOptional({ type: ChannelConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelConfigDto)
  general?: ChannelConfigDto;

  @ApiPropertyOptional({ type: ChannelConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelConfigDto)
  announcements?: ChannelConfigDto;

  @ApiPropertyOptional({ type: ChannelConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelConfigDto)
  league_chat?: ChannelConfigDto;

  @ApiPropertyOptional({ type: ChannelConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelConfigDto)
  tournament_chat?: ChannelConfigDto;

  @ApiPropertyOptional({ type: ChannelConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelConfigDto)
  logs?: ChannelConfigDto;
}

/**
 * Features configuration - boolean flags for feature toggles
 */
export class FeaturesConfigDto {
  @ApiPropertyOptional({
    description: 'Enable league management features',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  league_management?: boolean;

  @ApiPropertyOptional({
    description: 'Enable tournament mode',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  tournament_mode?: boolean;

  @ApiPropertyOptional({
    description: 'Enable automatic role assignment',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  auto_roles?: boolean;

  @ApiPropertyOptional({
    description: 'Enable statistics tracking',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  statistics?: boolean;

  @ApiPropertyOptional({
    description: 'Enable leaderboards',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  leaderboards?: boolean;
}

/**
 * Permissions configuration - role-based permissions
 */
export class PermissionsConfigDto {
  @ApiPropertyOptional({
    description: 'Roles that can create leagues',
    example: ['admin'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  create_leagues?: string[];

  @ApiPropertyOptional({
    description: 'Roles that can manage teams',
    example: ['admin', 'league_manager'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  manage_teams?: string[];

  @ApiPropertyOptional({
    description: 'Roles that can view statistics',
    example: ['member'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  view_stats?: string[];

  @ApiPropertyOptional({
    description: 'Roles that can manage tournaments',
    example: ['admin', 'tournament_manager'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  manage_tournaments?: string[];

  @ApiPropertyOptional({
    description: 'Roles that can manage roles',
    example: ['admin'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  manage_roles?: string[];

  @ApiPropertyOptional({
    description: 'Roles that can view logs',
    example: ['admin', 'moderator'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  view_logs?: string[];
}

/**
 * Display configuration - UI and display options
 */
export class DisplayConfigDto {
  @ApiPropertyOptional({
    description: 'Show leaderboards in guild',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  show_leaderboards?: boolean;

  @ApiPropertyOptional({
    description: 'Show member count',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  show_member_count?: boolean;

  @ApiPropertyOptional({
    description: 'Theme for bot messages',
    example: 'default',
    enum: ['default', 'dark', 'light'],
  })
  @IsOptional()
  @IsEnum(['default', 'dark', 'light'])
  theme?: string;

  @ApiPropertyOptional({
    description: 'Bot command prefix',
    example: '!',
  })
  @IsOptional()
  @IsString()
  @Length(1, 5)
  command_prefix?: string;
}

/**
 * Main guild settings DTO - container for all configuration types
 */
export class GuildSettingsDto {
  @ApiPropertyOptional({ type: ChannelsConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelsConfigDto)
  channels?: ChannelsConfigDto;

  @ApiPropertyOptional({ type: RolesConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RolesConfigDto)
  roles?: RolesConfigDto;

  @ApiPropertyOptional({ type: FeaturesConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FeaturesConfigDto)
  features?: FeaturesConfigDto;

  @ApiPropertyOptional({ type: PermissionsConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PermissionsConfigDto)
  permissions?: PermissionsConfigDto;

  @ApiPropertyOptional({ type: DisplayConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DisplayConfigDto)
  display?: DisplayConfigDto;
}

