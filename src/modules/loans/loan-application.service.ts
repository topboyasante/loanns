import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanApplication } from './entities/loan-application.entity.js';
import { LoanApplicationState } from './entities/loan-application-state.enum.js';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto.js';
import type { PaginationMeta } from '@/common/interfaces/api.interface.js';
import { RedisService } from '../../core/redis/redis.service.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const IDEMPOTENCY_TTL_SEC = 86400; // 24h
const IDEMPOTENCY_KEY_PREFIX = 'idempotency:';

interface IdempotencyEntry {
  applicationId: string;
  action: 'approve' | 'reject';
  application: LoanApplication;
}

@Injectable()
export class LoanApplicationService {
  constructor(
    @InjectRepository(LoanApplication)
    private readonly repo: Repository<LoanApplication>,
    private readonly redis: RedisService,
  ) {}

  async create(dto: CreateLoanApplicationDto): Promise<LoanApplication> {
    const entity = this.repo.create({
      applicantName: dto.applicantName,
      monthlyIncome: String(dto.monthlyIncome),
      requestedLoanAmount: String(dto.requestedLoanAmount),
      tenorInMonths: dto.tenorInMonths,
      state: LoanApplicationState.DRAFT,
    });
    return this.repo.save(entity);
  }

  async findById(id: string): Promise<LoanApplication> {
    const application = await this.repo.findOne({
      where: { id },
      relations: ['creditAssessment'],
    });
    if (!application) {
      throw new NotFoundException('Loan application not found');
    }
    return application;
  }

  async findAll(state?: LoanApplicationState): Promise<LoanApplication[]> {
    return this.repo.find({
      where: state ? { state } : {},
      relations: ['creditAssessment'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(
    state?: LoanApplicationState,
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_LIMIT,
  ): Promise<{ data: LoanApplication[]; meta: PaginationMeta }> {
    const cappedLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
    const pageNum = Math.max(1, page);
    const skip = (pageNum - 1) * cappedLimit;

    const where = state ? { state } : {};
    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['creditAssessment'],
      order: { createdAt: 'DESC' },
      skip,
      take: cappedLimit,
    });

    const totalPages = Math.ceil(total / cappedLimit) || 1;
    const meta: PaginationMeta = {
      page: pageNum,
      limit: cappedLimit,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrevious: pageNum > 1,
    };
    return { data, meta };
  }

  async approve(id: string, idempotencyKey?: string): Promise<LoanApplication> {
    if (idempotencyKey) {
      const cached = await this.getCachedIdempotency(idempotencyKey);
      if (cached) {
        if (cached.applicationId !== id || cached.action !== 'approve') {
          throw new ConflictException(
            'Idempotency key already used for a different request',
          );
        }
        return cached.application as LoanApplication;
      }
    }

    const application = await this.findById(id);
    if (application.state !== LoanApplicationState.CREDIT_PASSED) {
      throw new BadRequestException(
        'Only loan applications that have passed credit assessment can be approved',
      );
    }
    application.state = LoanApplicationState.APPROVED;
    const saved = await this.repo.save(application);

    if (idempotencyKey) {
      await this.setCachedIdempotency(idempotencyKey, id, 'approve', saved);
    }
    return saved;
  }

  async reject(id: string, reason?: string, idempotencyKey?: string): Promise<LoanApplication> {
    if (idempotencyKey) {
      const cached = await this.getCachedIdempotency(idempotencyKey);
      if (cached) {
        if (cached.applicationId !== id || cached.action !== 'reject') {
          throw new ConflictException(
            'Idempotency key already used for a different request',
          );
        }
        return cached.application as LoanApplication;
      }
    }

    const application = await this.findById(id);
    if (
      application.state === LoanApplicationState.APPROVED ||
      application.state === LoanApplicationState.REJECTED
    ) {
      throw new BadRequestException('Rejection is final and cannot be reversed');
    }
    application.state = LoanApplicationState.REJECTED;
    const saved = await this.repo.save(application);

    if (idempotencyKey) {
      await this.setCachedIdempotency(idempotencyKey, id, 'reject', saved);
    }
    return saved;
  }

  private async getCachedIdempotency(key: string): Promise<IdempotencyEntry | null> {
    const raw = await this.redis.get(IDEMPOTENCY_KEY_PREFIX + key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as IdempotencyEntry;
    } catch {
      return null;
    }
  }

  private async setCachedIdempotency(
    key: string,
    applicationId: string,
    action: 'approve' | 'reject',
    application: LoanApplication,
  ): Promise<void> {
    const entry: IdempotencyEntry = {
      applicationId,
      action,
      application: application as LoanApplication,
    };
    await this.redis.set(
      IDEMPOTENCY_KEY_PREFIX + key,
      JSON.stringify(entry, (k, v) => (k === 'loanApplication' ? undefined : v)),
      IDEMPOTENCY_TTL_SEC,
    );
  }
}
