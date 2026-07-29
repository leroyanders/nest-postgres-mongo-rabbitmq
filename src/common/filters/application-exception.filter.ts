import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApplicationError } from '../errors/application.error';
import { createErrorResponse } from './error-response.factory';

@Catch(ApplicationError)
export class ApplicationExceptionFilter implements ExceptionFilter<ApplicationError> {
  catch(exception: ApplicationError, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    response.status(exception.statusCode).json(
      createErrorResponse(request, {
        statusCode: exception.statusCode,
        message: exception.message,
        error: exception.error,
        code: exception.code,
        details: exception.details,
      }),
    );
  }
}
