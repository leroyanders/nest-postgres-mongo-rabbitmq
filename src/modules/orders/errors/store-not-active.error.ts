import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';

export class StoreNotActiveError extends ApplicationError {
  constructor() {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'The store is not accepting orders right now',
      error: 'Unprocessable Entity',
      code: 'STORE_NOT_ACTIVE',
    });
  }
}
