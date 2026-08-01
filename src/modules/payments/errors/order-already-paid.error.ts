import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';

export class OrderAlreadyPaidError extends ApplicationError {
  constructor() {
    super({
      statusCode: HttpStatus.CONFLICT,
      message: 'Order is already paid',
      error: 'Conflict',
      code: 'ORDER_ALREADY_PAID',
    });
  }
}
