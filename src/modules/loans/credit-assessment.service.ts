import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LoanApplication } from './entities/loan-application.entity.js';
import { CreditAssessment } from './entities/credit-assessment.entity.js';
import { LoanApplicationState } from './entities/loan-application-state.enum.js';
import { CreditAssessmentResult } from './entities/credit-assessment-result.enum.js';

@Injectable()
export class CreditAssessmentService {
  constructor(
    @InjectRepository(LoanApplication)
    private readonly loanRepo: Repository<LoanApplication>,
    @InjectRepository(CreditAssessment)
    private readonly assessmentRepo: Repository<CreditAssessment>,
    private readonly dataSource: DataSource,
  ) {}

  async runCreditAssessment(applicationId: string): Promise<LoanApplication> {
    const application = await this.loanRepo.findOne({
      where: { id: applicationId },
    });
    if (!application) {
      throw new NotFoundException('Loan application not found');
    }
    if (application.state !== LoanApplicationState.DRAFT) {
      throw new BadRequestException('Application already assessed');
    }

    const monthlyIncomeCents = Number(application.monthlyIncome);
    const requestedCents = Number(application.requestedLoanAmount);
    const tenor = application.tenorInMonths;

    // Ensure loan amount is at least equal to tenor to prevent $0/month installments
    // this will prevent us from having installments looking like $4/6 per month
    if (requestedCents < tenor) {
      throw new BadRequestException(
        'Requested loan amount must be at least equal to the tenor in months',
      );
    }

    const monthlyInstallmentCents = Math.floor(requestedCents / tenor);
    const pass = monthlyIncomeCents >= 3 * monthlyInstallmentCents;

    // Use transaction to ensure atomicity: either both assessment and state update succeed, or both rollback
    try {
      return await this.dataSource.transaction(async (manager) => {
        const assessment = manager.create(CreditAssessment, {
          loanApplicationId: application.id,
          result: pass ? CreditAssessmentResult.PASS : CreditAssessmentResult.FAIL,
          monthlyInstallment: String(monthlyInstallmentCents),
          rejectionReason: pass
            ? null
            : 'Monthly income is less than 3× the monthly installment',
        });
        await manager.save(CreditAssessment, assessment);

        application.state = pass
          ? LoanApplicationState.CREDIT_PASSED
          : LoanApplicationState.REJECTED;
        await manager.save(LoanApplication, application);

        return manager.findOneOrFail(LoanApplication, {
          where: { id: applicationId },
          relations: ['creditAssessment'],
        });
      });
    } catch (error: any) {
      // Handle race condition: if another request already created an assessment (unique constraint violation)
      if (error?.code === '23505' && error?.constraint?.includes('credit_assessments')) {
        throw new BadRequestException(
          'Credit assessment is already in progress or completed for this application',
        );
      }
      throw error;
    }
  }
}
