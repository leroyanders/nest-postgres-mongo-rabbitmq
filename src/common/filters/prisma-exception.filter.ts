import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { IHttpExceptionBody } from '../types/http-exception-body';
import { createErrorResponse } from './error-response.factory';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const httpException = this.mapException(exception);
    const statusCode = httpException.getStatus();
    const body = httpException.getResponse() as IHttpExceptionBody;

    response.status(statusCode).json(
      createErrorResponse(request, {
        statusCode,
        message: body.message ?? 'Database request failed',
        error: body.error ?? 'Database Error',
        code: body.code,
        details: body.details,
      }),
    );
  }

  private mapException(exception: Error): HttpException {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.mapKnownRequestError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return new BadRequestException({
        message: 'Invalid database query parameters',
        error: 'Bad Request',
        code: 'DATABASE_VALIDATION_ERROR',
      });
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return new ServiceUnavailableException({
        message: 'Database connection could not be initialized',
        error: 'Service Unavailable',
        code: 'DATABASE_INITIALIZATION_ERROR',
      });
    }

    if (exception instanceof Prisma.PrismaClientRustPanicError) {
      return new ServiceUnavailableException({
        message: 'Database client is temporarily unavailable',
        error: 'Service Unavailable',
        code: 'DATABASE_CLIENT_PANIC',
      });
    }

    return new InternalServerErrorException({
      message: 'An unexpected database error occurred',
      error: 'Internal Server Error',
      code: 'DATABASE_ERROR',
    });
  }

  private mapKnownRequestError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): HttpException {
    switch (exception.code) {
      case 'P2000':
        return new BadRequestException({
          message: 'The provided value is too long',
          error: 'Bad Request',
          code: exception.code,
        });

      case 'P2001':
      case 'P2025':
        return new NotFoundException({
          message: 'Requested resource was not found',
          error: 'Not Found',
          code: exception.code,
        });

      case 'P2002':
        return this.mapUniqueConstraintError(exception);

      case 'P2003':
        return new ConflictException({
          message: 'The operation violates a foreign key constraint',
          error: 'Conflict',
          code: exception.code,
        });

      case 'P2011':
      case 'P2012':
        return new BadRequestException({
          message: 'A required value is missing',
          error: 'Bad Request',
          code: exception.code,
        });

      case 'P2014':
        return new ConflictException({
          message: 'The operation violates a required relation',
          error: 'Conflict',
          code: exception.code,
        });

      case 'P2024':
        return new ServiceUnavailableException({
          message: 'Database connection pool timeout',
          error: 'Service Unavailable',
          code: exception.code,
        });

      default:
        return new InternalServerErrorException({
          message: 'A database operation failed',
          error: 'Internal Server Error',
          code: exception.code,
        });
    }
  }

  private mapUniqueConstraintError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): HttpException {
    const fields = this.extractUniqueFields(exception.meta);

    return new ConflictException({
      message:
        fields.length > 0
          ? `A record with this ${fields.join(', ')} already exists`
          : 'A record with these values already exists',
      error: 'Conflict',
      code: exception.code,
      details: fields.length > 0 ? { fields } : undefined,
    });
  }

  private extractUniqueFields(
    meta: Record<string, unknown> | undefined,
  ): string[] {
    const target = meta?.target;

    if (Array.isArray(target)) {
      return target.filter((item): item is string => typeof item === 'string');
    }

    if (typeof target === 'string') {
      return [target];
    }

    return [];
  }
}
