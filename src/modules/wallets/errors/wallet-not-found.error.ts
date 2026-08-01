import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';

export class WalletNotFoundError extends ApplicationError {
  constructor() {
    super({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Wallet was not found',
      error: 'Not Found',
      code: 'WALLET_NOT_FOUND',
    });
  }
}
