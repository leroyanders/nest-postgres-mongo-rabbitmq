import { Injectable } from '@nestjs/common';
import {
  DEFAULT_PAGE_SIZE,
  PaginationQueryDto,
} from '../../../common/dtos/pagination-query.dto';
import { randomSlugSuffix, slugify } from '../../../common/utils/slugify';
import { PrismaService } from '../../../database/services/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import {
  ProductStatus,
  ProductVariantStatus,
  StoreStatus,
} from '../../../generated/prisma/enums';
import { StoreService } from '../../stores/services/store.service';
import { CreateProductDto } from '../dtos/create-product.dto';
import { CreateProductVariantDto } from '../dtos/create-product-variant.dto';
import { ListProductsQueryDto } from '../dtos/list-products-query.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';
import { UpdateProductVariantDto } from '../dtos/update-product-variant.dto';

const VARIANT_SELECT = {
  id: true,
  name: true,
  sku: true,
  barcode: true,
  price: true,
  oldPrice: true,
  currency: true,
  attributes: true,
  images: true,
  weight: true,
  status: true,
  isDefault: true,
} as const;

const PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  images: true,
  status: true,
  brand: true,
  attributes: true,
  createdAt: true,
  store: { select: { id: true, name: true, slug: true } },
} as const;

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeService: StoreService,
  ) {}

  // ---------------------------------------------------------------
  // Public catalog
  // ---------------------------------------------------------------

  listProducts(query: ListProductsQueryDto) {
    return this.prisma.product.findMany({
      select: {
        ...PRODUCT_SELECT,
        variants: {
          select: VARIANT_SELECT,
          where: { isDefault: true, deletedAt: null },
        },
      },
      where: {
        status: ProductStatus.ACTIVE,
        deletedAt: null,
        store: {
          status: StoreStatus.ACTIVE,
          deletedAt: null,
          ...(query.storeSlug ? { slug: query.storeSlug } : {}),
        },
        ...(query.categorySlug
          ? { categories: { some: { category: { slug: query.categorySlug } } } }
          : {}),
        ...(query.search
          ? { name: { contains: query.search, mode: 'insensitive' as const } }
          : {}),
        ...(query.brand ? { brand: query.brand } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.take ?? DEFAULT_PAGE_SIZE,
      skip: query.skip ?? 0,
    });
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findFirstOrThrow({
      select: {
        ...PRODUCT_SELECT,
        variants: {
          select: VARIANT_SELECT,
          where: { deletedAt: null },
          orderBy: { isDefault: 'desc' },
        },
        categories: {
          select: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      where: { id, status: ProductStatus.ACTIVE, deletedAt: null },
    });

    const rating = await this.prisma.review.aggregate({
      _avg: { rating: true },
      _count: { rating: true },
      where: { productId: id, isPublished: true, deletedAt: null },
    });

    return {
      ...product,
      categories: product.categories.map((link) => link.category),
      rating: {
        average: rating._avg.rating,
        count: rating._count.rating,
      },
    };
  }

  // ---------------------------------------------------------------
  // Store owner management
  // ---------------------------------------------------------------

  async listStoreProducts(
    accountId: string,
    storeId: string,
    pagination: PaginationQueryDto,
  ) {
    await this.storeService.requireOwnedStore(accountId, storeId);

    return this.prisma.product.findMany({
      select: {
        ...PRODUCT_SELECT,
        variants: { select: VARIANT_SELECT, where: { deletedAt: null } },
      },
      where: { storeId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: pagination.take ?? DEFAULT_PAGE_SIZE,
      skip: pagination.skip ?? 0,
    });
  }

  async createProduct(accountId: string, dto: CreateProductDto) {
    await this.storeService.requireOwnedStore(accountId, dto.storeId);

    const variants = this.normalizeVariants(dto.variants);

    return this.prisma.product.create({
      select: {
        ...PRODUCT_SELECT,
        variants: { select: VARIANT_SELECT },
      },
      data: {
        storeId: dto.storeId,
        name: dto.name,
        slug: await this.uniqueSlug(dto.storeId, dto.name),
        description: dto.description,
        brand: dto.brand,
        images: dto.images ?? [],
        attributes: dto.attributes as Prisma.InputJsonValue | undefined,
        variants: {
          create: variants.map((variant) => ({
            name: variant.name,
            sku: variant.sku,
            barcode: variant.barcode,
            price: variant.price,
            oldPrice: variant.oldPrice,
            costPrice: variant.costPrice,
            currency: variant.currency,
            attributes: variant.attributes as Prisma.InputJsonValue | undefined,
            images: variant.images ?? [],
            weight: variant.weight,
            isDefault: variant.isDefault,
          })),
        },
        ...(dto.categoryIds?.length
          ? {
              categories: {
                create: dto.categoryIds.map((categoryId) => ({ categoryId })),
              },
            }
          : {}),
      },
    });
  }

  async updateProduct(
    accountId: string,
    productId: string,
    dto: UpdateProductDto,
  ) {
    await this.requireOwnedProduct(accountId, productId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId } });
        await tx.productCategory.createMany({
          data: dto.categoryIds.map((categoryId) => ({
            productId,
            categoryId,
          })),
        });
      }

      return tx.product.update({
        select: {
          ...PRODUCT_SELECT,
          variants: { select: VARIANT_SELECT, where: { deletedAt: null } },
        },
        where: { id: productId },
        data: {
          name: dto.name,
          description: dto.description,
          brand: dto.brand,
          images: dto.images,
          attributes: dto.attributes as Prisma.InputJsonValue | undefined,
          status: dto.status,
        },
      });
    });
  }

  async deleteProduct(accountId: string, productId: string): Promise<void> {
    await this.requireOwnedProduct(accountId, productId);

    await this.prisma.product.update({
      select: { id: true },
      where: { id: productId },
      data: { status: ProductStatus.ARCHIVED, deletedAt: new Date() },
    });
  }

  async addVariant(
    accountId: string,
    productId: string,
    dto: CreateProductVariantDto,
  ) {
    await this.requireOwnedProduct(accountId, productId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.productVariant.updateMany({
          where: { productId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.productVariant.create({
        select: VARIANT_SELECT,
        data: {
          productId,
          name: dto.name,
          sku: dto.sku,
          barcode: dto.barcode,
          price: dto.price,
          oldPrice: dto.oldPrice,
          costPrice: dto.costPrice,
          currency: dto.currency,
          attributes: dto.attributes as Prisma.InputJsonValue | undefined,
          images: dto.images ?? [],
          weight: dto.weight,
          isDefault: dto.isDefault ?? false,
        },
      });
    });
  }

  async updateVariant(
    accountId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
  ) {
    const variant = await this.prisma.productVariant.findFirstOrThrow({
      select: { id: true, productId: true },
      where: {
        id: variantId,
        deletedAt: null,
        product: { deletedAt: null, store: { ownerId: accountId } },
      },
    });

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.productVariant.updateMany({
          where: { productId: variant.productId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.productVariant.update({
        select: VARIANT_SELECT,
        where: { id: variantId },
        data: {
          name: dto.name,
          barcode: dto.barcode,
          price: dto.price,
          oldPrice: dto.oldPrice,
          costPrice: dto.costPrice,
          attributes: dto.attributes as Prisma.InputJsonValue | undefined,
          images: dto.images,
          weight: dto.weight,
          status: dto.status,
          isDefault: dto.isDefault,
        },
      });
    });
  }

  async deleteVariant(accountId: string, variantId: string): Promise<void> {
    await this.prisma.productVariant.findFirstOrThrow({
      select: { id: true },
      where: {
        id: variantId,
        deletedAt: null,
        product: { store: { ownerId: accountId } },
      },
    });

    await this.prisma.productVariant.update({
      select: { id: true },
      where: { id: variantId },
      data: {
        status: ProductVariantStatus.INACTIVE,
        isDefault: false,
        deletedAt: new Date(),
      },
    });
  }

  private async requireOwnedProduct(accountId: string, productId: string) {
    return this.prisma.product.findFirstOrThrow({
      select: { id: true, storeId: true },
      where: {
        id: productId,
        deletedAt: null,
        store: { ownerId: accountId, deletedAt: null },
      },
    });
  }

  /**
   * Guarantees exactly one default variant: the first one flagged by the
   * client wins, otherwise the first variant becomes the default.
   */
  private normalizeVariants(
    variants: CreateProductVariantDto[],
  ): CreateProductVariantDto[] {
    const defaultIndex = Math.max(
      variants.findIndex((variant) => variant.isDefault),
      0,
    );

    return variants.map((variant, index) => ({
      ...variant,
      isDefault: index === defaultIndex,
    }));
  }

  private async uniqueSlug(storeId: string, name: string): Promise<string> {
    const base = slugify(name) || 'product';
    const existing = await this.prisma.product.findUnique({
      select: { id: true },
      where: { storeId_slug: { storeId, slug: base } },
    });

    return existing ? `${base}-${randomSlugSuffix()}` : base;
  }
}
