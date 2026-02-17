import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoanApplicationState } from '../entities/loan-application-state.enum';
import { CreditAssessmentResult } from '../entities/credit-assessment-result.enum';

export class CreditAssessmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: CreditAssessmentResult })
  result: CreditAssessmentResult;

  @ApiProperty({ description: 'Monthly installment in cents' })
  monthlyInstallment: string;

  @ApiPropertyOptional()
  rejectionReason: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class LoanApplicationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  applicantName: string;

  @ApiProperty({ description: 'Monthly income in cents' })
  monthlyIncome: string;

  @ApiProperty({ description: 'Requested loan amount in cents' })
  requestedLoanAmount: string;

  @ApiProperty()
  tenorInMonths: number;

  @ApiProperty({ enum: LoanApplicationState })
  state: LoanApplicationState;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: CreditAssessmentResponseDto })
  creditAssessment?: CreditAssessmentResponseDto;
}
