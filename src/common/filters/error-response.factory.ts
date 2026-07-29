import type { Request } from 'express';
import { ErrorResponse } from '../types/error-response';

export function createErrorResponse(
  request: Request,
  body: Pick<
    ErrorResponse,
    'statusCode' | 'message' | 'error' | 'code' | 'details'
  >,
): ErrorResponse {
  return {
    ...body,
    timestamp: new Date().toISOString(),
    path: request.originalUrl,
    method: request.method,
  };
}
