import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { OrderStatus } from '../../../generated/prisma/enums';

export class InvalidOrderStatusTransitionError extends ApplicationError {
  constructor(from: OrderStatus, to: OrderStatus) {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: `Order status cannot change from ${from} to ${to}`,
      error: 'Unprocessable Entity',
      code: 'INVALID_ORDER_STATUS_TRANSITION',
      details: { from, to },
    });
  }
}
