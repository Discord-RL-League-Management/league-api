import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveLeagueMemberDto {
  @ApiProperty({
    description: 'User ID (CUID) of the person approving the member',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  approvedBy!: string;
}


