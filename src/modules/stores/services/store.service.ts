import { Injectable } from '@nestjs/common';
import { randomSlugSuffix, slugify } from '../../../common/utils/slugify';
import { PrismaService } from '../../../database/services/prisma.service';
import { StoreStatus } from '../../../generated/prisma/enums';
import { CreateStoreDto } from '../dtos/create-store.dto';
import { UpdateStoreDto } from '../dtos/update-store.dto';
import { InvalidStoreStatusTransitionError } from '../errors/invalid-store-status-transition.error';

const STORE_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logo: true,
  banner: true,
  phone: true,
  email: true,
  status: true,
  createdAt: true,
} as const;

const ALLOWED_STATUS_TRANSITIONS: Record<StoreStatus, StoreStatus[]> = {
  [StoreStatus.DRAFT]: [StoreStatus.ACTIVE, StoreStatus.CLOSED],
  [StoreStatus.ACTIVE]: [StoreStatus.SUSPENDED, StoreStatus.CLOSED],
  [StoreStatus.SUSPENDED]: [StoreStatus.ACTIVE, StoreStatus.CLOSED],
  [StoreStatus.CLOSED]: [],
};

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Loads a store owned by the given account or throws (404 via the Prisma
   * exception filter). Used by catalog/stock/order modules for ownership
   * checks before mutating store-scoped data.
   */
  requireOwnedStore(accountId: string, storeId: string) {
    return this.prisma.store.findFirstOrThrow({
      select: { id: true, status: true },
      where: { id: storeId, ownerId: accountId, deletedAt: null },
    });
  }

  async createStore(accountId: string, dto: CreateStoreDto) {
    return this.prisma.store.create({
      select: STORE_SELECT,
      data: {
        name: dto.name,
        slug: await this.uniqueSlug(dto.name),
        description: dto.description,
        logo: dto.logo,
        banner: dto.banner,
        phone: dto.phone,
        email: dto.email,
        ownerId: accountId,
      },
    });
  }

  listMyStores(accountId: string) {
    return this.prisma.store.findMany({
      select: STORE_SELECT,
      where: { ownerId: accountId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  getStoreBySlug(slug: string) {
    return this.prisma.store.findFirstOrThrow({
      select: STORE_SELECT,
      where: {
        slug,
        deletedAt: null,
        status: { in: [StoreStatus.ACTIVE, StoreStatus.SUSPENDED] },
      },
    });
  }

  async updateStore(accountId: string, storeId: string, dto: UpdateStoreDto) {
    await this.requireOwnedStore(accountId, storeId);

    return this.prisma.store.update({
      select: STORE_SELECT,
      where: { id: storeId },
      data: dto,
    });
  }

  async updateStoreStatus(
    accountId: string,
    storeId: string,
    status: StoreStatus,
  ) {
    const store = await this.requireOwnedStore(accountId, storeId);

    if (!ALLOWED_STATUS_TRANSITIONS[store.status].includes(status)) {
      throw new InvalidStoreStatusTransitionError(store.status, status);
    }

    return this.prisma.store.update({
      select: STORE_SELECT,
      where: { id: storeId },
      data: { status },
    });
  }

  async deleteStore(accountId: string, storeId: string): Promise<void> {
    await this.requireOwnedStore(accountId, storeId);

    await this.prisma.store.update({
      select: { id: true },
      where: { id: storeId },
      data: { status: StoreStatus.CLOSED, deletedAt: new Date() },
    });
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'store';
    const existing = await this.prisma.store.findUnique({
      select: { id: true },
      where: { slug: base },
    });

    return existing ? `${base}-${randomSlugSuffix()}` : base;
  }
}
