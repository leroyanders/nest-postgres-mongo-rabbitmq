export type HttpExceptionBody = {
  message?: string | string[];
  error?: string;
  code?: string;
  details?: unknown;
};
