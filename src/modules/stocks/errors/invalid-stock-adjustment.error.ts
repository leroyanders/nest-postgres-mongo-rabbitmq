import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';

export class InvalidStockAdjustmentError extends ApplicationError {
  constructor(message: string) {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message,
      error: 'Unprocessable Entity',
      code: 'INVALID_STOCK_ADJUSTMENT',
    });
  }
}
