import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/services/prisma.service';
import { UpdateProfileDto } from '../dtos/update-profile.dto';

const PROFILE_SELECT = {
  id: true,
  name: true,
  lastname: true,
  username: true,
  balance: true,
} as const;

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  getProfile(accountId: string) {
    return this.prisma.profile.findUniqueOrThrow({
      select: PROFILE_SELECT,
      where: { account_id: accountId },
    });
  }

  updateProfile(accountId: string, dto: UpdateProfileDto) {
    return this.prisma.profile.update({
      select: PROFILE_SELECT,
      where: { account_id: accountId },
      data: {
        name: dto.name,
        lastname: dto.lastname,
        username: dto.username,
      },
    });
  }
}
