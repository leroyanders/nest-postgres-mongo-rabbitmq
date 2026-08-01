import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IAuthUser } from '../../shared/auth/types/auth-user';
import { AuthenticatedRequest } from '../../shared/auth/types/authenticated-request';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IAuthUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
