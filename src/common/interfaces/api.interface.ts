/**
 * Standard API response structure for successful responses.
 *
 * @template T - The type of data being returned
 */
export interface ApiResponse<T = any> {
  /**
   * Indicates whether the request was successful
   */
  success: boolean;

  /**
   * Human-readable message describing the result
   */
  message: string;

  /**
   * The actual response data
   */
  data: T;

  /**
   * Unique identifier for tracking this request
   */
  request_id: string;
}

/**
 * Pagination metadata for paginated responses.
 */
export interface PaginationMeta {
  /**
   * Current page number (1-indexed)
   */
  page: number;

  /**
   * Number of items per page
   */
  limit: number;

  /**
   * Total number of items across all pages
   */
  total: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Whether there is a next page
   */
  hasNext: boolean;

  /**
   * Whether there is a previous page
   */
  hasPrevious: boolean;
}

/**
 * Standard API response structure for paginated data.
 *
 * @template T - The type of items in the data array
 */
export interface ApiPaginatedResponse<T = any> {
  /**
   * Indicates whether the request was successful
   */
  success: boolean;

  /**
   * Human-readable message describing the result
   */
  message: string;

  /**
   * Array of items for the current page
   */
  data: T[];

  /**
   * Pagination metadata
   */
  meta: PaginationMeta;

  /**
   * Unique identifier for tracking this request
   */
  request_id: string;
}

/**
 * Detailed error information structure.
 */
export interface ErrorDetails {
  /**
   * Error code (e.g., 'VALIDATION_FAILED', 'NOT_FOUND', 'UNAUTHORIZED')
   */
  code: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Detailed validation errors or additional error information
   */
  details?: Record<string, string | string[]>;
}

/**
 * Standard API error response structure.
 */
export interface ApiErrorResponse {
  /**
   * Indicates whether the request was successful (always false for errors)
   */
  success: boolean;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Detailed error information
   */
  error: ErrorDetails;

  /**
   * Unique identifier for tracking this request
   */
  request_id: string;
}
