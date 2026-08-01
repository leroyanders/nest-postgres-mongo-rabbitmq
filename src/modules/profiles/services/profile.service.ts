import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/services/prisma.service';
import { UpdateProfileDto } from '../dtos/update-profile.dto';

const PROFILE_SELECT = {
  id: true,
  name: true,
  lastname: true,
  username: true,
  phone: true,
  avatar: true,
  createdAt: true,
} as const;

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the profile id for an account. Most domain entities (addresses,
   * carts, orders, reviews, wallet) hang off the profile, while the JWT only
   * carries the account id.
   */
  async requireProfileId(accountId: string): Promise<string> {
    const profile = await this.prisma.profile.findUniqueOrThrow({
      select: { id: true },
      where: { accountId },
    });

    return profile.id;
  }

  getProfile(accountId: string) {
    return this.prisma.profile.findUniqueOrThrow({
      select: PROFILE_SELECT,
      where: { accountId },
    });
  }

  updateProfile(accountId: string, dto: UpdateProfileDto) {
    return this.prisma.profile.update({
      select: PROFILE_SELECT,
      where: { accountId },
      data: {
        name: dto.name,
        lastname: dto.lastname,
        username: dto.username,
        phone: dto.phone,
        avatar: dto.avatar,
      },
    });
  }
}
