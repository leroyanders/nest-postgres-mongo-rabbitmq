import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';

export class EmptyCartError extends ApplicationError {
  constructor() {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Cannot checkout an empty cart',
      error: 'Unprocessable Entity',
      code: 'EMPTY_CART',
    });
  }
}
