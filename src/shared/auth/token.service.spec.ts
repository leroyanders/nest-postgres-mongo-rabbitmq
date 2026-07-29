import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { TokenService } from './token.service';

const SECRET = 'test-secret';

function createService(secret = SECRET, expiresIn = '1h'): TokenService {
  const configService = {
    get: (key: string) => (key === 'jwt.secret' ? secret : expiresIn),
  } as unknown as ConfigService;

  return new TokenService(configService as never);
}

describe('TokenService', () => {
  it('signs and verifies a token for an account id', () => {
    const service = createService();

    const token = service.sign('account-1');

    expect(service.verify(token)).toEqual({ sub: 'account-1' });
  });

  it('rejects a token signed with a different secret', () => {
    const service = createService();
    const forged = jwt.sign({}, 'other-secret', { subject: 'account-1' });

    expect(() => service.verify(forged)).toThrow(UnauthorizedException);
  });

  it('rejects an unsigned (decode-only) token', () => {
    const service = createService();
    const unsigned = jwt.sign({}, '', {
      subject: 'account-1',
      algorithm: 'none',
    });

    expect(() => service.verify(unsigned)).toThrow(UnauthorizedException);
  });

  it('rejects an expired token', () => {
    const service = createService();
    const expired = jwt.sign({}, SECRET, {
      subject: 'account-1',
      expiresIn: -10,
    });

    expect(() => service.verify(expired)).toThrow(UnauthorizedException);
  });

  it('rejects garbage input', () => {
    const service = createService();

    expect(() => service.verify('not-a-token')).toThrow(UnauthorizedException);
  });

  it('rejects a valid signature without a subject claim', () => {
    const service = createService();
    const withoutSubject = jwt.sign({ foo: 'bar' }, SECRET);

    expect(() => service.verify(withoutSubject)).toThrow(UnauthorizedException);
  });
});
