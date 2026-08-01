export interface IAppConfig {
  port: number;
  database: {
    postgres: {
      url: string;
    };
    mongodb: {
      url: string;
    };
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  rabbitmq: {
    url: string;
    queue: string;
  };
}
