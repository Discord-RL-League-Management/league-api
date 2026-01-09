import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Membership configuration DTO
 */
export class MembershipConfigDto {
  @ApiPropertyOptional({
    enum: ['OPEN', 'INVITE_ONLY', 'APPLICATION'],
    description: 'How players can join the league',
  })
  @IsOptional()
  @IsEnum(['OPEN', 'INVITE_ONLY', 'APPLICATION'])
  joinMethod?: 'OPEN' | 'INVITE_ONLY' | 'APPLICATION';

  @ApiPropertyOptional({
    description: 'Require admin approval for join requests',
  })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({
    description: 'Allow players to register themselves',
  })
  @IsOptional()
  @IsBoolean()
  allowSelfRegistration?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum players allowed in league',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxPlayers?: number | null;

  @ApiPropertyOptional({
    description: 'Minimum players required to activate league',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minPlayers?: number | null;

  @ApiPropertyOptional({
    description: 'Maximum teams allowed in league',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTeams?: number | null;

  @ApiPropertyOptional({
    description: 'Is registration currently open',
  })
  @IsOptional()
  @IsBoolean()
  registrationOpen?: boolean;

  @ApiPropertyOptional({
    description: 'Registration start date',
  })
  @IsOptional()
  registrationStartDate?: Date | null;

  @ApiPropertyOptional({
    description: 'Registration end date',
  })
  @IsOptional()
  registrationEndDate?: Date | null;

  @ApiPropertyOptional({
    description: 'Automatically close registration when max players reached',
  })
  @IsOptional()
  @IsBoolean()
  autoCloseOnFull?: boolean;

  @ApiPropertyOptional({
    description: 'Require guild membership to join',
  })
  @IsOptional()
  @IsBoolean()
  requireGuildMembership?: boolean;

  @ApiPropertyOptional({
    description: 'Require player status to join',
  })
  @IsOptional()
  @IsBoolean()
  requirePlayerStatus?: boolean;

  @ApiPropertyOptional({
    description: 'Allow player to join multiple leagues',
  })
  @IsOptional()
  @IsBoolean()
  allowMultipleLeagues?: boolean;

  @ApiPropertyOptional({
    description: 'Cooldown period in days after leaving before can rejoin',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cooldownAfterLeave?: number | null;

  @ApiPropertyOptional({
    description: 'Teams must belong to an organization',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requireOrganization?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum organizations allowed in league (null = unlimited)',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxOrganizations?: number | null;

  @ApiPropertyOptional({
    description: 'Maximum teams per organization (null = unlimited)',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTeamsPerOrganization?: number | null;
}

/**
 * Game configuration DTO
 */
export class GameConfigDto {
  @ApiPropertyOptional({
    enum: ['ROCKET_LEAGUE', 'DOTA_2'],
    description: 'Game type associated with league (null = game-agnostic)',
  })
  @IsOptional()
  @IsEnum(['ROCKET_LEAGUE', 'DOTA_2'])
  gameType?: 'ROCKET_LEAGUE' | 'DOTA_2' | null;

  @ApiPropertyOptional({
    enum: ['STEAM', 'EPIC', 'XBL', 'PSN', 'SWITCH'],
    type: [String],
    description: 'Allowed platforms',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(['STEAM', 'EPIC', 'XBL', 'PSN', 'SWITCH'], { each: true })
  platform?: Array<'STEAM' | 'EPIC' | 'XBL' | 'PSN' | 'SWITCH'> | null;
}

/**
 * Skill configuration DTO
 */
export class SkillConfigDto {
  @ApiPropertyOptional({
    description: 'Is this a skill-based league',
  })
  @IsOptional()
  @IsBoolean()
  isSkillBased?: boolean;

  @ApiPropertyOptional({
    enum: ['MMR', 'RANK', 'ELO', 'CUSTOM'],
    description: 'Skill metric used',
  })
  @IsOptional()
  @IsEnum(['MMR', 'RANK', 'ELO', 'CUSTOM'])
  skillMetric?: 'MMR' | 'RANK' | 'ELO' | 'CUSTOM' | null;

  @ApiPropertyOptional({
    description: 'Minimum skill level required',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSkillLevel?: number | null;

  @ApiPropertyOptional({
    description: 'Maximum skill level allowed',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSkillLevel?: number | null;

  @ApiPropertyOptional({
    description: 'Require tracker to be registered',
  })
  @IsOptional()
  @IsBoolean()
  requireTracker?: boolean;

  @ApiPropertyOptional({
    description: 'Allowed tracker platforms',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trackerPlatforms?: Array<string> | null;
}

/**
 * Visibility configuration DTO
 */
export class VisibilityConfigDto {
  @ApiPropertyOptional({
    description: 'League is visible to all guild members',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Show league in directory',
  })
  @IsOptional()
  @IsBoolean()
  showInDirectory?: boolean;

  @ApiPropertyOptional({
    description: 'Allow non-members to view league',
  })
  @IsOptional()
  @IsBoolean()
  allowSpectators?: boolean;
}

/**
 * Administration configuration DTO
 */
export class AdministrationConfigDto {
  @ApiPropertyOptional({
    description: 'Discord role IDs that are league admins',
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsString({ each: true })
  @Matches(/^\d{17,20}$/, {
    each: true,
    message: 'Each role ID must be a valid Discord snowflake',
  })
  adminRoles?: Array<string>;

  @ApiPropertyOptional({
    description: 'Allow players to report issues',
  })
  @IsOptional()
  @IsBoolean()
  allowPlayerReports?: boolean;

  @ApiPropertyOptional({
    description: 'Allow admins to suspend players',
  })
  @IsOptional()
  @IsBoolean()
  allowSuspensions?: boolean;

  @ApiPropertyOptional({
    description: 'Allow admins to ban players',
  })
  @IsOptional()
  @IsBoolean()
  allowBans?: boolean;
}

/**
 * League settings DTO - partial LeagueConfiguration
 */
export class LeagueSettingsDto {
  @ApiPropertyOptional({
    type: MembershipConfigDto,
    description: 'Membership configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MembershipConfigDto)
  membership?: Partial<MembershipConfigDto>;

  @ApiPropertyOptional({
    type: GameConfigDto,
    description: 'Game configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GameConfigDto)
  game?: Partial<GameConfigDto>;

  @ApiPropertyOptional({
    type: SkillConfigDto,
    description: 'Skill configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SkillConfigDto)
  skill?: Partial<SkillConfigDto>;

  @ApiPropertyOptional({
    type: VisibilityConfigDto,
    description: 'Visibility configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VisibilityConfigDto)
  visibility?: Partial<VisibilityConfigDto>;

  @ApiPropertyOptional({
    type: AdministrationConfigDto,
    description: 'Administration configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdministrationConfigDto)
  administration?: Partial<AdministrationConfigDto>;
}
