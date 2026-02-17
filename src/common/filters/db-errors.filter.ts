import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response, Request } from 'express';
import { ApiErrorResponse } from '../interfaces/api.interface';

@Catch(QueryFailedError)
export class ORMExceptionFilter implements ExceptionFilter {
  catch(
    exception: QueryFailedError & { code?: string; detail?: string },
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Default values for generic DB errors
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'DATABASE_ERROR';
    let message = 'A database error occurred while processing your request.';
    let details: Record<string, string | string[]> = {};

    // Map specific DB engine codes (PostgreSQL examples below)
    switch (exception.code) {
      case '23505': // Unique violation
        status = HttpStatus.CONFLICT;
        code = 'DUPLICATE_ENTRY';
        message = 'The record you are trying to create already exists.';
        details = {
          conflict: exception.detail || 'Unique constraint violation',
        };
        break;
      case '23503': // Foreign key violation
        status = HttpStatus.BAD_REQUEST;
        code = 'REFERENCE_ERROR';
        message =
          'The operation failed because a related record was not found.';
        details = { constraint: exception.detail || 'Foreign key violation' };
        break;
      case '23502': // Not null violation
        status = HttpStatus.BAD_REQUEST;
        code = 'MISSING_FIELD';
        message = 'A required field is missing.';
        break;
      case 'P0001': // raise_exception (e.g. final-state immutability trigger)
        if (
          exception.message?.includes('Cannot update loan application in final state')
        ) {
          status = HttpStatus.BAD_REQUEST;
          code = 'IMMUTABLE_STATE';
          message =
            'This loan application is in a final state and cannot be modified.';
        }
        break;
    }

    const errorBody: ApiErrorResponse = {
      success: false,
      message: message,
      error: {
        code: code,
        message: message,
        details: details,
      },
      // Using a fallback if you don't have a request ID middleware yet
      request_id:
        (request.headers['x-request-id'] as string) || 'internal-trace-id',
    };

    response.status(status).json(errorBody);
  }
}
