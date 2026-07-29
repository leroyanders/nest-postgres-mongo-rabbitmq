import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';

export class InvalidAmountError extends ApplicationError {
  constructor(details?: unknown) {
    super({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Amount must be greater than zero',
      error: 'Bad Request',
      code: 'INVALID_AMOUNT',
      details,
    });
  }
}
