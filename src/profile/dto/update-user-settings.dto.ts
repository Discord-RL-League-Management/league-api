import {
  IsOptional,
  IsBoolean,
  IsString,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class NotificationSettingsDto {
  @ApiPropertyOptional({
    description: 'Enable email notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({
    description: 'Enable Discord notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  discord?: boolean;

  @ApiPropertyOptional({
    description: 'Enable game reminders',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  gameReminders?: boolean;
}

class PrivacySettingsDto {
  @ApiPropertyOptional({
    description: 'Show stats publicly',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showStats?: boolean;

  @ApiPropertyOptional({
    description: 'Show guilds publicly',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showGuilds?: boolean;

  @ApiPropertyOptional({
    description: 'Show games publicly',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showGames?: boolean;
}

class PreferencesSettingsDto {
  @ApiPropertyOptional({
    description: 'Language preference',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Timezone',
    example: 'UTC',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UpdateUserSettingsDto {
  @ApiPropertyOptional({
    type: NotificationSettingsDto,
    description: 'Notification settings',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notifications?: NotificationSettingsDto;

  @ApiPropertyOptional({
    enum: ['light', 'dark', 'auto'],
    description: 'Theme preference',
    example: 'auto',
  })
  @IsOptional()
  @IsEnum(['light', 'dark', 'auto'], {
    message: 'Theme must be one of: light, dark, auto',
  })
  theme?: 'light' | 'dark' | 'auto';

  @ApiPropertyOptional({
    type: PrivacySettingsDto,
    description: 'Privacy settings',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PrivacySettingsDto)
  privacy?: PrivacySettingsDto;

  @ApiPropertyOptional({
    type: PreferencesSettingsDto,
    description: 'User preferences',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesSettingsDto)
  preferences?: PreferencesSettingsDto;
}
