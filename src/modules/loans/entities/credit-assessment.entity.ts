import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CreditAssessmentResult } from './credit-assessment-result.enum.js';
import { LoanApplication } from './loan-application.entity.js';

@Entity('credit_assessments')
export class CreditAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'loan_application_id', type: 'uuid', unique: true })
  loanApplicationId: string;

  @Column({
    name: 'result',
    type: 'enum',
    enum: CreditAssessmentResult,
  })
  result: CreditAssessmentResult;

  /** Monthly installment in smallest currency unit (e.g. cents). Used for 3× income rule. */
  @Column({ name: 'monthly_installment', type: 'bigint' })
  monthlyInstallment: string;

  @Column({ name: 'rejection_reason', type: 'varchar', length: 500, nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => LoanApplication, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loan_application_id' })
  loanApplication: LoanApplication;
}
