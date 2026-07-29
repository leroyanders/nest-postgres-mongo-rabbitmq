import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';

export class SelfTransferError extends ApplicationError {
  constructor() {
    super({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Cannot transfer funds to your own account',
      error: 'Bad Request',
      code: 'SELF_TRANSFER_NOT_ALLOWED',
    });
  }
}
