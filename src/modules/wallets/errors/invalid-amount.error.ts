import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';

export class InvalidAmountError extends ApplicationError {
  constructor() {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Amount must be a positive number',
      error: 'Unprocessable Entity',
      code: 'INVALID_AMOUNT',
    });
  }
}
