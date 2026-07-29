import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';

export class RecipientNotFoundError extends ApplicationError {
  constructor() {
    super({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Recipient account was not found',
      error: 'Not Found',
      code: 'RECIPIENT_NOT_FOUND',
    });
  }
}
