import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessTrackersDto {
  @ApiProperty({
    description: 'Discord guild ID (snowflake)',
    example: '987654321098765432',
    minLength: 17,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{17,20}$/, {
    message: 'Guild ID must be a valid Discord snowflake ID (17-20 digits)',
  })
  @Length(17, 20)
  guildId!: string;
}
