import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';

export class CurrencyMismatchError extends ApplicationError {
  constructor(expected: string, actual: string) {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: `Wallet currency ${actual} does not match required currency ${expected}`,
      error: 'Unprocessable Entity',
      code: 'CURRENCY_MISMATCH',
      details: { expected, actual },
    });
  }
}
