import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';

export class InsufficientStockError extends ApplicationError {
  constructor(variantId: string) {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Not enough stock available for this variant',
      error: 'Unprocessable Entity',
      code: 'INSUFFICIENT_STOCK',
      details: { variantId },
    });
  }
}
