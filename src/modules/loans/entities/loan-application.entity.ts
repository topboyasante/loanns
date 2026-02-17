import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { LoanApplicationState } from './loan-application-state.enum.js';
import { CreditAssessment } from './credit-assessment.entity.js';

@Entity('loan_applications')
@Index(['state'])
export class LoanApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'applicant_name', type: 'varchar', length: 255 })
  applicantName: string;

  /** Monthly income in smallest currency unit (e.g. cents). */
  @Column({ name: 'monthly_income', type: 'bigint' })
  monthlyIncome: string;

  /** Requested loan amount in smallest currency unit (e.g. cents). */
  @Column({ name: 'requested_loan_amount', type: 'bigint' })
  requestedLoanAmount: string;

  @Column({ name: 'tenor_in_months', type: 'int' })
  tenorInMonths: number;

  @Column({
    name: 'state',
    type: 'enum',
    enum: LoanApplicationState,
    default: LoanApplicationState.DRAFT,
  })
  state: LoanApplicationState;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => CreditAssessment, (assessment) => assessment.loanApplication)
  creditAssessment?: CreditAssessment;
}
