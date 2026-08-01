import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';

export class VariantUnavailableError extends ApplicationError {
  constructor(variantId: string) {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'This product variant is not available for purchase',
      error: 'Unprocessable Entity',
      code: 'VARIANT_UNAVAILABLE',
      details: { variantId },
    });
  }
}
