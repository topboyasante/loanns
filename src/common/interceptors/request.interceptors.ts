import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiPaginatedResponse,
  ApiResponse,
} from '@/common/interfaces/api.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T> | ApiPaginatedResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | ApiPaginatedResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.requestId || 'unknown';

    return next.handle().pipe(
      map((data) => {
        // Check if the response is already formatted
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'message' in data
        ) {
          return data;
        }

        // Check if this is a paginated response
        if (this.isPaginatedResponse(data)) {
          return {
            success: true,
            message: 'Request successful',
            data: data.data,
            meta: data.meta,
            request_id: requestId,
          } as ApiPaginatedResponse<T>;
        }

        // Standard response format
        return {
          success: true,
          message: 'Request successful',
          data: data,
          request_id: requestId,
        } as ApiResponse<T>;
      }),
    );
  }

  /**
   * Checks if the response data is a paginated response.
   *
   * @param data - The response data to check
   * @returns True if the data is a paginated response
   */
  private isPaginatedResponse(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      'data' in data &&
      'meta' in data &&
      Array.isArray(data.data) &&
      typeof data.meta === 'object' &&
      'page' in data.meta &&
      'limit' in data.meta &&
      'total' in data.meta
    );
  }
}
