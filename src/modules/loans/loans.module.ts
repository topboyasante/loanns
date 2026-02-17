import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanApplication } from './entities/loan-application.entity.js';
import { CreditAssessment } from './entities/credit-assessment.entity.js';
import { LoanApplicationService } from './loan-application.service.js';
import { CreditAssessmentService } from './credit-assessment.service.js';
import { LoanApplicationsController } from './loan-applications.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanApplication, CreditAssessment]),
  ],
  controllers: [LoanApplicationsController],
  providers: [LoanApplicationService, CreditAssessmentService],
})
export class LoansModule {}
