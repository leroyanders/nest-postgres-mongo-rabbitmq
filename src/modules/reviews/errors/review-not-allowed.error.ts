import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';

export class ReviewNotAllowedError extends ApplicationError {
  constructor() {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Only delivered or completed order items can be reviewed',
      error: 'Unprocessable Entity',
      code: 'REVIEW_NOT_ALLOWED',
    });
  }
}
