import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOutboxEventDto {
  @ApiProperty({
    description: 'Source type of the event (e.g., tracker, user)',
    example: 'tracker',
  })
  @IsString()
  @IsNotEmpty()
  sourceType!: string;

  @ApiProperty({
    description: 'ID of the source entity',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  sourceId!: string;

  @ApiProperty({
    description: 'Type of event (e.g., CREATED, UPDATED)',
    example: 'CREATED',
  })
  @IsString()
  @IsNotEmpty()
  eventType!: string;

  @ApiProperty({
    description: 'Event payload data',
    example: { id: 'clx1234567890', userId: '123456789' },
  })
  @IsObject()
  @IsNotEmpty()
  payload!: Record<string, any>;
}
