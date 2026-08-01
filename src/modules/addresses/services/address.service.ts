import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/services/prisma.service';
import { CreateAddressDto } from '../dtos/create-address.dto';
import { UpdateAddressDto } from '../dtos/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  listAddresses(profileId: string) {
    return this.prisma.address.findMany({
      where: { profileId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(profileId: string, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { profileId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: { ...dto, profileId },
      });
    });
  }

  async updateAddress(
    profileId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { profileId, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id: addressId, profileId },
        data: dto,
      });
    });
  }

  async deleteAddress(profileId: string, addressId: string): Promise<void> {
    await this.prisma.address.delete({
      where: { id: addressId, profileId },
    });
  }
}
