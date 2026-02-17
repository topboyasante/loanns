import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreditAssessmentService } from './credit-assessment.service';
import { LoanApplication } from './entities/loan-application.entity';
import { CreditAssessment } from './entities/credit-assessment.entity';
import { LoanApplicationState } from './entities/loan-application-state.enum';
import { CreditAssessmentResult } from './entities/credit-assessment-result.enum';

describe('CreditAssessmentService', () => {
  let service: CreditAssessmentService;
  let loanRepo: Repository<LoanApplication>;
  let assessmentRepo: Repository<CreditAssessment>;
  let dataSource: DataSource;

  const mockLoanRepo = {
    findOne: jest.fn(),
  };

  const mockAssessmentRepo = {
    create: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditAssessmentService,
        {
          provide: getRepositoryToken(LoanApplication),
          useValue: mockLoanRepo,
        },
        {
          provide: getRepositoryToken(CreditAssessment),
          useValue: mockAssessmentRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<CreditAssessmentService>(CreditAssessmentService);
    loanRepo = module.get<Repository<LoanApplication>>(
      getRepositoryToken(LoanApplication),
    );
    assessmentRepo = module.get<Repository<CreditAssessment>>(
      getRepositoryToken(CreditAssessment),
    );
    dataSource = module.get<DataSource>(DataSource);

    jest.clearAllMocks();
  });

  describe('runCreditAssessment', () => {
    const createMockApplication = (overrides = {}) => ({
      id: 'test-id',
      applicantName: 'Jane Doe',
      monthlyIncome: '300000',
      requestedLoanAmount: '1000000',
      tenorInMonths: 12,
      state: LoanApplicationState.DRAFT,
      ...overrides,
    });

    const createMockTransactionManager = () => ({
      create: jest.fn(),
      save: jest.fn(),
      findOneOrFail: jest.fn(),
    });

    it('should calculate monthly installment correctly', async () => {
      const application = createMockApplication();
      const manager = createMockTransactionManager();

      mockLoanRepo.findOne.mockResolvedValue(application);
      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(manager);
      });

      manager.create.mockReturnValue({});
      manager.save.mockResolvedValue({});
      manager.findOneOrFail.mockResolvedValue({
        ...application,
        creditAssessment: {},
      });

      await service.runCreditAssessment('test-id');

      // Verify installment calculation: Math.floor(1000000 / 12) = 83333
      expect(manager.create).toHaveBeenCalledWith(
        CreditAssessment,
        expect.objectContaining({
          monthlyInstallment: '83333',
        }),
      );
    });

    it('should PASS when income >= 3 × installment', async () => {
      const application = createMockApplication({
        monthlyIncome: '300000', // 3000.00
        requestedLoanAmount: '1000000', // 10000.00
        tenorInMonths: 12,
      });
      const manager = createMockTransactionManager();

      mockLoanRepo.findOne.mockResolvedValue(application);
      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(manager);
      });

      manager.create.mockReturnValue({});
      manager.save.mockResolvedValue({});
      manager.findOneOrFail.mockResolvedValue({
        ...application,
        state: LoanApplicationState.CREDIT_PASSED,
        creditAssessment: {
          result: CreditAssessmentResult.PASS,
        },
      });

      const result = await service.runCreditAssessment('test-id');

      expect(manager.create).toHaveBeenCalledWith(
        CreditAssessment,
        expect.objectContaining({
          result: CreditAssessmentResult.PASS,
          rejectionReason: null,
        }),
      );
      expect(manager.save).toHaveBeenCalledWith(
        LoanApplication,
        expect.objectContaining({
          state: LoanApplicationState.CREDIT_PASSED,
        }),
      );
    });

    it('should FAIL when income < 3 × installment', async () => {
      const application = createMockApplication({
        monthlyIncome: '200000', // 2000.00
        requestedLoanAmount: '1000000', // 10000.00
        tenorInMonths: 12,
      });
      const manager = createMockTransactionManager();

      mockLoanRepo.findOne.mockResolvedValue(application);
      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(manager);
      });

      manager.create.mockReturnValue({});
      manager.save.mockResolvedValue({});
      manager.findOneOrFail.mockResolvedValue({
        ...application,
        state: LoanApplicationState.REJECTED,
        creditAssessment: {
          result: CreditAssessmentResult.FAIL,
        },
      });

      const result = await service.runCreditAssessment('test-id');

      expect(manager.create).toHaveBeenCalledWith(
        CreditAssessment,
        expect.objectContaining({
          result: CreditAssessmentResult.FAIL,
          rejectionReason:
            'Monthly income is less than 3× the monthly installment',
        }),
      );
      expect(manager.save).toHaveBeenCalledWith(
        LoanApplication,
        expect.objectContaining({
          state: LoanApplicationState.REJECTED,
        }),
      );
    });

    it('should PASS when income exactly equals 3 × installment (boundary)', async () => {
      const application = createMockApplication({
        monthlyIncome: '250000', // Exactly 3 × 83333.33 (rounded)
        requestedLoanAmount: '1000000',
        tenorInMonths: 12,
      });
      const manager = createMockTransactionManager();

      mockLoanRepo.findOne.mockResolvedValue(application);
      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(manager);
      });

      manager.create.mockReturnValue({});
      manager.save.mockResolvedValue({});
      manager.findOneOrFail.mockResolvedValue({
        ...application,
        state: LoanApplicationState.CREDIT_PASSED,
        creditAssessment: { result: CreditAssessmentResult.PASS },
      });

      await service.runCreditAssessment('test-id');

      expect(manager.create).toHaveBeenCalledWith(
        CreditAssessment,
        expect.objectContaining({
          result: CreditAssessmentResult.PASS,
        }),
      );
    });

    it('should throw NotFoundException when application not found', async () => {
      mockLoanRepo.findOne.mockResolvedValue(null);

      await expect(service.runCreditAssessment('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.runCreditAssessment('non-existent')).rejects.toThrow(
        'Loan application not found',
      );
    });

    it('should throw BadRequestException when state is not DRAFT', async () => {
      const application = createMockApplication({
        state: LoanApplicationState.CREDIT_PASSED,
      });

      mockLoanRepo.findOne.mockResolvedValue(application);

      await expect(service.runCreditAssessment('test-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.runCreditAssessment('test-id')).rejects.toThrow(
        'Application already assessed',
      );
    });

    it('should throw BadRequestException when requestedLoanAmount < tenor', async () => {
      const application = createMockApplication({
        requestedLoanAmount: '5', // Less than tenor (12)
        tenorInMonths: 12,
      });

      mockLoanRepo.findOne.mockResolvedValue(application);

      await expect(service.runCreditAssessment('test-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.runCreditAssessment('test-id')).rejects.toThrow(
        'Requested loan amount must be at least equal to the tenor in months',
      );
    });

    it('should handle race condition error (unique constraint violation)', async () => {
      const application = createMockApplication();
      const manager = createMockTransactionManager();

      mockLoanRepo.findOne.mockResolvedValue(application);
      mockDataSource.transaction.mockImplementation(async (callback) => {
        const error = new Error('Unique constraint violation');
        (error as any).code = '23505';
        (error as any).constraint = 'credit_assessments_loan_application_id_key';
        throw error;
      });

      await expect(service.runCreditAssessment('test-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.runCreditAssessment('test-id')).rejects.toThrow(
        'Credit assessment is already in progress or completed for this application',
      );
    });

    it('should return application with creditAssessment relation loaded', async () => {
      const application = createMockApplication();
      const manager = createMockTransactionManager();
      const creditAssessment = {
        id: 'assessment-id',
        result: CreditAssessmentResult.PASS,
      };

      mockLoanRepo.findOne.mockResolvedValue(application);
      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(manager);
      });

      manager.create.mockReturnValue({});
      manager.save.mockResolvedValue({});
      manager.findOneOrFail.mockResolvedValue({
        ...application,
        creditAssessment,
      });

      const result = await service.runCreditAssessment('test-id');

      expect(manager.findOneOrFail).toHaveBeenCalledWith(LoanApplication, {
        where: { id: 'test-id' },
        relations: ['creditAssessment'],
      });
      expect(result.creditAssessment).toEqual(creditAssessment);
    });
  });
});
