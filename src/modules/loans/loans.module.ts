import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanApplication } from './entities/loan-application.entity.js';
import { CreditAssessment } from './entities/credit-assessment.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanApplication, CreditAssessment]),
  ],
})
export class LoansModule {}
