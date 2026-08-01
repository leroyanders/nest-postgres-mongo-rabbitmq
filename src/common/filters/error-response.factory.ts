import type { Request } from 'express';
import { IErrorResponse } from '../types/error-response';

export function createErrorResponse(
  request: Request,
  body: Pick<
    IErrorResponse,
    'statusCode' | 'message' | 'error' | 'code' | 'details'
  >,
): IErrorResponse {
  return {
    ...body,
    timestamp: new Date().toISOString(),
    path: request.originalUrl,
    method: request.method,
  };
}
