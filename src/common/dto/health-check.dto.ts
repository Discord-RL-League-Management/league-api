import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckResponseDto {
  @ApiProperty({
    description: 'Health status',
    example: 'ok',
  })
  @IsString()
  @IsNotEmpty()
  status!: string;

  @ApiProperty({
    description: 'Status message',
    example: 'Bot authenticated successfully',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({
    description: 'Timestamp of the health check',
    example: '2025-01-27T10:30:00.000Z',
  })
  @IsString()
  @IsNotEmpty()
  timestamp!: string;
}
