export type ErrorResponse = {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error: string;
  code?: string;
  details?: unknown;
};
