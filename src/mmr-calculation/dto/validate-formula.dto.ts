import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * ValidateFormulaDto - DTO for validating formulas
 */
export class ValidateFormulaDto {
  @ApiProperty({
    description: 'Custom MMR formula to validate',
    example: '(ones * 0.1 + twos * 0.3 + threes * 0.5 + fours * 0.1)',
  })
  @IsString()
  formula!: string;
}

