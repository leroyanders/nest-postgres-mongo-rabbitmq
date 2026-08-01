import { IAppConfig } from './types/app-config';

// Environment variables are validated in env.validation.ts before the app
// starts, so the assertions below are safe at runtime.
export const configuration = (): IAppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    postgres: {
      url: process.env.DATABASE_URL as string,
    },
    mongodb: {
      url: process.env.MONGODB_CONNECTION_STRING as string,
    },
  },
  jwt: {
    secret: process.env.APP_JWT_SECRET as string,
    expiresIn: process.env.APP_JWT_EXPIRES_IN ?? '1h',
    refreshExpiresIn: process.env.APP_JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL as string,
    queue: process.env.RABBITMQ_QUEUE as string,
  },
});
