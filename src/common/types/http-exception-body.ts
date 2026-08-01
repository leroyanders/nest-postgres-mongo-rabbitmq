export interface IHttpExceptionBody {
  message?: string | string[];
  error?: string;
  code?: string;
  details?: unknown;
}
