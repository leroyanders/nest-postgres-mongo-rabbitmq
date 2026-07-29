export interface AppConfig {
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
  };
  rabbitmq: {
    url: string;
    queue: string;
  };
}
