import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { OrderStatus } from '../../../generated/prisma/enums';

export class OrderNotPayableError extends ApplicationError {
  constructor(status: OrderStatus) {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: `Order in status ${status} cannot be paid`,
      error: 'Unprocessable Entity',
      code: 'ORDER_NOT_PAYABLE',
      details: { status },
    });
  }
}
