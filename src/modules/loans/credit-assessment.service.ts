import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const monthlyInstallmentCents = Math.floor(requestedCents / tenor);
    const pass = monthlyIncomeCents >= 3 * monthlyInstallmentCents;

    const assessment = this.assessmentRepo.create({
      loanApplicationId: application.id,
      result: pass ? CreditAssessmentResult.PASS : CreditAssessmentResult.FAIL,
      monthlyInstallment: String(monthlyInstallmentCents),
      rejectionReason: pass
        ? null
        : 'Monthly income is less than 3× the monthly installment',
    });
    await this.assessmentRepo.save(assessment);

    application.state = pass
      ? LoanApplicationState.CREDIT_PASSED
      : LoanApplicationState.REJECTED;
    await this.loanRepo.save(application);

    return this.loanRepo.findOneOrFail({
      where: { id: applicationId },
      relations: ['creditAssessment'],
    });
  }
}
