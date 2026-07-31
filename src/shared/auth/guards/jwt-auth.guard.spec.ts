import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../services/token.service';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { JwtAuthGuard } from './jwt-auth.guard';

function createContext(headers: Record<string, string>): {
  context: ExecutionContext;
  request: AuthenticatedRequest;
} {
  const request = { headers } as unknown as AuthenticatedRequest;
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;

  return { context, request };
}

describe('JwtAuthGuard', () => {
  let tokenService: jest.Mocked<Pick<TokenService, 'verify'>>;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    tokenService = { verify: jest.fn() };
    guard = new JwtAuthGuard(tokenService as unknown as TokenService);
  });

  it('rejects a request without an authorization header', () => {
    const { context } = createContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it('rejects a non-bearer authorization scheme', () => {
    const { context } = createContext({ authorization: 'Basic abc' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it('verifies the token and attaches the user to the request', () => {
    const { context, request } = createContext({
      authorization: 'Bearer valid-token',
    });
    tokenService.verify.mockReturnValue({ sub: 'account-1' });

    expect(guard.canActivate(context)).toBe(true);
    expect(tokenService.verify).toHaveBeenCalledWith('valid-token');
    expect(request.user).toEqual({ id: 'account-1' });
  });

  it('propagates verification failures', () => {
    const { context } = createContext({ authorization: 'Bearer bad-token' });
    tokenService.verify.mockImplementation(() => {
      throw new UnauthorizedException();
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
