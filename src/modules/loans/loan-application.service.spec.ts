import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LoanApplicationService } from './loan-application.service';
import { LoanApplication } from './entities/loan-application.entity';
import { LoanApplicationState } from './entities/loan-application-state.enum';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { CreditAssessment } from './entities/credit-assessment.entity';

describe('LoanApplicationService', () => {
  let service: LoanApplicationService;
  let repo: Repository<LoanApplication>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoanApplicationService,
        {
          provide: getRepositoryToken(LoanApplication),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<LoanApplicationService>(LoanApplicationService);
    repo = module.get<Repository<LoanApplication>>(
      getRepositoryToken(LoanApplication),
    );

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a loan application in DRAFT state', async () => {
      const dto: CreateLoanApplicationDto = {
        applicantName: 'Jane Doe',
        monthlyIncome: 300000,
        requestedLoanAmount: 1000000,
        tenorInMonths: 12,
      };

      const savedEntity = {
        id: 'test-id',
        ...dto,
        monthlyIncome: String(dto.monthlyIncome),
        requestedLoanAmount: String(dto.requestedLoanAmount),
        state: LoanApplicationState.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(savedEntity);
      mockRepository.save.mockResolvedValue(savedEntity);

      const result = await service.create(dto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        applicantName: dto.applicantName,
        monthlyIncome: String(dto.monthlyIncome),
        requestedLoanAmount: String(dto.requestedLoanAmount),
        tenorInMonths: dto.tenorInMonths,
        state: LoanApplicationState.DRAFT,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(savedEntity);
      expect(result.state).toBe(LoanApplicationState.DRAFT);
    });
  });

  describe('findById', () => {
    it('should return application with creditAssessment relation', async () => {
      const application = {
        id: 'test-id',
        applicantName: 'Jane Doe',
        state: LoanApplicationState.DRAFT,
        creditAssessment: null,
      };

      mockRepository.findOne.mockResolvedValue(application);

      const result = await service.findById('test-id');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        relations: ['creditAssessment'],
      });
      expect(result).toEqual(application);
    });

    it('should throw NotFoundException when application not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('non-existent')).rejects.toThrow(
        'Loan application not found',
      );
    });
  });

  describe('approve', () => {
    it('should successfully approve from CREDIT_PASSED state', async () => {
      const application = {
        id: 'test-id',
        state: LoanApplicationState.CREDIT_PASSED,
        save: jest.fn(),
      };

      mockRepository.findOne.mockResolvedValue(application);
      mockRepository.save.mockResolvedValue({
        ...application,
        state: LoanApplicationState.APPROVED,
      });

      const result = await service.approve('test-id');

      expect(result.state).toBe(LoanApplicationState.APPROVED);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when state is DRAFT', async () => {
      const application = {
        id: 'test-id',
        state: LoanApplicationState.DRAFT,
      };

      mockRepository.findOne.mockResolvedValue(application);

      await expect(service.approve('test-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.approve('test-id')).rejects.toThrow(
        'Application must pass credit assessment before approval',
      );
    });

    it('should throw BadRequestException when state is APPROVED', async () => {
      const application = {
        id: 'test-id',
        state: LoanApplicationState.APPROVED,
      };

      mockRepository.findOne.mockResolvedValue(application);

      await expect(service.approve('test-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.approve('test-id')).rejects.toThrow(
        'Application is already approved',
      );
    });

    it('should throw BadRequestException when state is REJECTED', async () => {
      const application = {
        id: 'test-id',
        state: LoanApplicationState.REJECTED,
      };

      mockRepository.findOne.mockResolvedValue(application);

      await expect(service.approve('test-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.approve('test-id')).rejects.toThrow(
        'Cannot approve a rejected application',
      );
    });
  });

  describe('reject', () => {
    it('should successfully reject from DRAFT state', async () => {
      const application = {
        id: 'test-id',
        state: LoanApplicationState.DRAFT,
        rejectionReason: null,
      };

      mockRepository.findOne.mockResolvedValue(application);
      mockRepository.save.mockResolvedValue({
        ...application,
        state: LoanApplicationState.REJECTED,
        rejectionReason: null,
      });

      const result = await service.reject('test-id');

      expect(result.state).toBe(LoanApplicationState.REJECTED);
      expect(result.rejectionReason).toBeNull();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should successfully reject from CREDIT_PASSED state', async () => {
      const application = {
        id: 'test-id',
        state: LoanApplicationState.CREDIT_PASSED,
        rejectionReason: null,
      };

      mockRepository.findOne.mockResolvedValue(application);
      mockRepository.save.mockResolvedValue({
        ...application,
        state: LoanApplicationState.REJECTED,
        rejectionReason: 'Manual rejection',
      });

      const result = await service.reject('test-id', 'Manual rejection');

      expect(result.state).toBe(LoanApplicationState.REJECTED);
      expect(result.rejectionReason).toBe('Manual rejection');
    });

    it('should set rejectionReason when provided', async () => {
      const application = {
        id: 'test-id',
        state: LoanApplicationState.DRAFT,
        rejectionReason: null,
      };

      mockRepository.findOne.mockResolvedValue(application);
      mockRepository.save.mockResolvedValue({
        ...application,
        state: LoanApplicationState.REJECTED,
        rejectionReason: 'Test reason',
      });

      const result = await service.reject('test-id', 'Test reason');

      expect(result.rejectionReason).toBe('Test reason');
    });

    it('should set rejectionReason to null when not provided', async () => {
      const application = {
        id: 'test-id',
        state: LoanApplicationState.DRAFT,
        rejectionReason: null,
      };

      mockRepository.findOne.mockResolvedValue(application);
      mockRepository.save.mockResolvedValue({
        ...application,
        state: LoanApplicationState.REJECTED,
        rejectionReason: null,
      });

      const result = await service.reject('test-id');

      expect(result.rejectionReason).toBeNull();
    });

    it('should throw BadRequestException when state is APPROVED', async () => {
      const application = {
        id: 'test-id',
        state: LoanApplicationState.APPROVED,
      };

      mockRepository.findOne.mockResolvedValue(application);

      await expect(service.reject('test-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reject('test-id')).rejects.toThrow(
        'Cannot reject an approved application',
      );
    });

    it('should throw BadRequestException when state is REJECTED', async () => {
      const application = {
        id: 'test-id',
        state: LoanApplicationState.REJECTED,
      };

      mockRepository.findOne.mockResolvedValue(application);

      await expect(service.reject('test-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reject('test-id')).rejects.toThrow(
        'Application is already rejected',
      );
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated results with correct meta', async () => {
      const applications = [
        { id: '1', state: LoanApplicationState.DRAFT },
        { id: '2', state: LoanApplicationState.DRAFT },
      ];

      mockRepository.findAndCount.mockResolvedValue([applications, 2]);

      const result = await service.findAllPaginated(undefined, 1, 20);

      expect(result.data).toEqual(applications);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasNext).toBe(false);
      expect(result.meta.hasPrevious).toBe(false);
    });

    it('should handle invalid page (clamps to 1)', async () => {
      const applications = [{ id: '1' }];

      mockRepository.findAndCount.mockResolvedValue([applications, 1]);

      const result = await service.findAllPaginated(undefined, 0, 20);

      expect(result.meta.page).toBe(1);
    });

    it('should handle invalid limit (clamps to max 100)', async () => {
      const applications = [{ id: '1' }];

      mockRepository.findAndCount.mockResolvedValue([applications, 1]);

      const result = await service.findAllPaginated(undefined, 1, 200);

      expect(result.meta.limit).toBe(100);
    });

    it('should filter by state when provided', async () => {
      const applications = [{ id: '1', state: LoanApplicationState.DRAFT }];

      mockRepository.findAndCount.mockResolvedValue([applications, 1]);

      await service.findAllPaginated(LoanApplicationState.DRAFT, 1, 20);

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { state: LoanApplicationState.DRAFT },
        relations: ['creditAssessment'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });
  });
});
