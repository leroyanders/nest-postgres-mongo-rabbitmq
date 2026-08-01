import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { IAppConfig } from '../../../config/types/app-config';
import { IJwtPayload } from '../types/jwt-payload';

@Injectable()
export class TokenService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor(configService: ConfigService<IAppConfig, true>) {
    this.secret = configService.get('jwt.secret', { infer: true });
    this.expiresIn = configService.get('jwt.expiresIn', { infer: true });
  }

  sign(accountId: string): string {
    return jwt.sign({}, this.secret, {
      subject: accountId,
      expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  verify(token: string): IJwtPayload {
    let payload: string | JwtPayload;

    try {
      payload = jwt.verify(token, this.secret);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof payload.sub !== 'string'
    ) {
      throw new UnauthorizedException('Malformed token payload');
    }

    return {
      sub: payload.sub,
    };
  }
}
