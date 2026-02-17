import {
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLoanApplicationDto {
  @ApiProperty({ example: 'Jane Doe', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  applicantName: string;

  /** Monthly income in smallest currency unit (e.g. cents). */
  @ApiProperty({ example: 300000, description: 'Monthly income in cents' })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  monthlyIncome: number;

  /** Requested loan amount in smallest currency unit (e.g. cents). */
  @ApiProperty({ example: 1000000, description: 'Requested amount in cents' })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  requestedLoanAmount: number;

  @ApiProperty({ example: 12, minimum: 1, maximum: 600 })
  @IsInt()
  @Min(1)
  @Max(600)
  tenorInMonths: number;
}
