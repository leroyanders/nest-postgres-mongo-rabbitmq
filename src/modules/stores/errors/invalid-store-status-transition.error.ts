import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { StoreStatus } from '../../../generated/prisma/enums';

export class InvalidStoreStatusTransitionError extends ApplicationError {
  constructor(from: StoreStatus, to: StoreStatus) {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: `Store status cannot change from ${from} to ${to}`,
      error: 'Unprocessable Entity',
      code: 'INVALID_STORE_STATUS_TRANSITION',
      details: { from, to },
    });
  }
}
