import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LoanApplicationService } from './loan-application.service.js';
import { CreditAssessmentService } from './credit-assessment.service.js';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto.js';
import { RejectLoanDto } from './dto/reject-loan.dto.js';
import { LoanApplicationResponseDto } from './dto/loan-application-response.dto.js';
import { LoanApplicationState } from './entities/loan-application-state.enum.js';

@ApiTags('loan-applications')
@Controller('loan-applications')
export class LoanApplicationsController {
  constructor(
    private readonly loanApplicationService: LoanApplicationService,
    private readonly creditAssessmentService: CreditAssessmentService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a loan application (DRAFT)' })
  @ApiResponse({ status: 201, description: 'Created', type: LoanApplicationResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  create(@Body() dto: CreateLoanApplicationDto) {
    return this.loanApplicationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List loan applications (paginated)' })
  @ApiQuery({ name: 'state', required: false, enum: LoanApplicationState })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiResponse({ status: 200, description: 'OK' })
  findAll(
    @Query('state') state?: LoanApplicationState,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.loanApplicationService.findAllPaginated(state, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a loan application by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'OK', type: LoanApplicationResponseDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loanApplicationService.findById(id);
  }

  @Post(':id/credit-assessment')
  @ApiOperation({ summary: 'Run credit assessment (3× income rule)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'OK', type: LoanApplicationResponseDto })
  @ApiResponse({ status: 400, description: 'Application already assessed' })
  @ApiResponse({ status: 404, description: 'Not found' })
  runCreditAssessment(@Param('id', ParseUUIDPipe) id: string) {
    return this.creditAssessmentService.runCreditAssessment(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve application (only if credit passed). Supports Idempotency-Key header.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'OK', type: LoanApplicationResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state for approval' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Idempotency key already used for different request' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.loanApplicationService.approve(id, idempotencyKey);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject application (final, cannot be reversed). Supports Idempotency-Key header.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'OK', type: LoanApplicationResponseDto })
  @ApiResponse({ status: 400, description: 'Rejection is final' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Idempotency key already used for different request' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RejectLoanDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.loanApplicationService.reject(id, body?.reason, idempotencyKey);
  }
}
