import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(65535)
  declare PORT?: number;

  @IsString()
  @IsNotEmpty()
  declare DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  declare MONGODB_CONNECTION_STRING: string;

  @IsString()
  @IsNotEmpty()
  declare APP_JWT_SECRET: string;

  @IsOptional()
  @IsString()
  declare APP_JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  declare APP_JWT_REFRESH_EXPIRES_IN?: string;

  @IsString()
  @IsNotEmpty()
  declare RABBITMQ_URL: string;

  @IsString()
  @IsNotEmpty()
  declare RABBITMQ_QUEUE: string;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
