import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';

export class InsufficientFundsError extends ApplicationError {
  constructor() {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Insufficient funds or wallet not found',
      error: 'Unprocessable Entity',
      code: 'INSUFFICIENT_FUNDS',
    });
  }
}
