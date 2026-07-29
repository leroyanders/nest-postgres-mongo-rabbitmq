import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { AppConfig } from '../../config/types/app-config';
import { JwtPayload } from './types/jwt-payload';

@Injectable()
export class TokenService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    this.secret = configService.get('jwt.secret', { infer: true });
    this.expiresIn = configService.get('jwt.expiresIn', { infer: true });
  }

  sign(accountId: string): string {
    return jwt.sign({}, this.secret, {
      subject: accountId,
      expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  verify(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, this.secret);

      if (typeof payload === 'string' || typeof payload.sub !== 'string') {
        throw new Error('Malformed token payload');
      }

      return { sub: payload.sub };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
