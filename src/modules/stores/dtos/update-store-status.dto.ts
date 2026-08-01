import { IsEnum } from 'class-validator';
import { StoreStatus } from '../../../generated/prisma/enums';

export class UpdateStoreStatusDto {
  @IsEnum(StoreStatus)
  declare status: StoreStatus;
}
