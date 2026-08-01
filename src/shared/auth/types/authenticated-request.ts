import type { Request } from 'express';
import { IAuthUser } from './auth-user';

export interface AuthenticatedRequest extends Request {
  user: IAuthUser;
}
