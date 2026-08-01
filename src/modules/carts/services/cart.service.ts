import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/services/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import {
  ProductStatus,
  ProductVariantStatus,
  StoreStatus,
} from '../../../generated/prisma/enums';
import { InsufficientStockError } from '../../stocks/errors/insufficient-stock.error';
import { AddCartItemDto } from '../dtos/add-cart-item.dto';
import { VariantUnavailableError } from '../errors/variant-unavailable.error';

const CART_ITEM_SELECT = {
  id: true,
  quantity: true,
  variant: {
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      oldPrice: true,
      currency: true,
      images: true,
      product: {
        select: { id: true, name: true, slug: true, images: true },
      },
    },
  },
} as const;

const CART_SELECT = {
  id: true,
  store: { select: { id: true, name: true, slug: true } },
  items: { select: CART_ITEM_SELECT, orderBy: { createdAt: 'asc' as const } },
  updatedAt: true,
} as const;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async listMyCarts(profileId: string) {
    const carts = await this.prisma.cart.findMany({
      select: CART_SELECT,
      where: { profileId },
      orderBy: { updatedAt: 'desc' },
    });

    return carts.map((cart) => this.withTotals(cart));
  }

  async addItem(profileId: string, dto: AddCartItemDto) {
    const variant = await this.prisma.productVariant.findFirst({
      select: {
        id: true,
        product: { select: { storeId: true } },
        stock: {
          select: { quantity: true, reservedQuantity: true, isActive: true },
        },
      },
      where: {
        id: dto.variantId,
        status: ProductVariantStatus.ACTIVE,
        deletedAt: null,
        product: {
          status: ProductStatus.ACTIVE,
          deletedAt: null,
          store: { status: StoreStatus.ACTIVE, deletedAt: null },
        },
      },
    });

    if (!variant) {
      throw new VariantUnavailableError(dto.variantId);
    }

    const cart = await this.prisma.$transaction(async (tx) => {
      const { id: cartId } = await tx.cart.upsert({
        select: { id: true },
        where: {
          profileId_storeId: {
            profileId,
            storeId: variant.product.storeId,
          },
        },
        create: { profileId, storeId: variant.product.storeId },
        update: {},
      });

      const existingItem = await tx.cartItem.findUnique({
        select: { id: true, quantity: true },
        where: { cartId_variantId: { cartId, variantId: dto.variantId } },
      });

      const desiredQuantity = (existingItem?.quantity ?? 0) + dto.quantity;
      this.assertStockAvailable(variant.stock, desiredQuantity, dto.variantId);

      await tx.cartItem.upsert({
        select: { id: true },
        where: { cartId_variantId: { cartId, variantId: dto.variantId } },
        create: { cartId, variantId: dto.variantId, quantity: dto.quantity },
        update: { quantity: desiredQuantity },
      });

      return tx.cart.findUniqueOrThrow({
        select: CART_SELECT,
        where: { id: cartId },
      });
    });

    return this.withTotals(cart);
  }

  async updateItem(profileId: string, itemId: string, quantity: number) {
    const item = await this.prisma.cartItem.findFirstOrThrow({
      select: {
        cartId: true,
        variant: {
          select: {
            id: true,
            stock: {
              select: {
                quantity: true,
                reservedQuantity: true,
                isActive: true,
              },
            },
          },
        },
      },
      where: { id: itemId, cart: { profileId } },
    });

    this.assertStockAvailable(item.variant.stock, quantity, item.variant.id);

    await this.prisma.cartItem.update({
      select: { id: true },
      where: { id: itemId },
      data: { quantity },
    });

    const cart = await this.prisma.cart.findUniqueOrThrow({
      select: CART_SELECT,
      where: { id: item.cartId },
    });

    return this.withTotals(cart);
  }

  async removeItem(profileId: string, itemId: string): Promise<void> {
    const item = await this.prisma.cartItem.findFirstOrThrow({
      select: { id: true, cartId: true },
      where: { id: itemId, cart: { profileId } },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.delete({
        select: { id: true },
        where: { id: item.id },
      });

      const remaining = await tx.cartItem.count({
        where: { cartId: item.cartId },
      });

      if (remaining === 0) {
        await tx.cart.delete({
          select: { id: true },
          where: { id: item.cartId },
        });
      }
    });
  }

  async clearCart(profileId: string, cartId: string): Promise<void> {
    await this.prisma.cart.delete({
      select: { id: true },
      where: { id: cartId, profileId },
    });
  }

  private assertStockAvailable(
    stock: {
      quantity: bigint;
      reservedQuantity: bigint;
      isActive: boolean;
    } | null,
    desiredQuantity: number,
    variantId: string,
  ): void {
    const available =
      stock && stock.isActive
        ? Number(stock.quantity - stock.reservedQuantity)
        : 0;

    if (available < desiredQuantity) {
      throw new InsufficientStockError(variantId);
    }
  }

  private withTotals(cart: {
    id: string;
    store: { id: string; name: string; slug: string };
    items: Array<{
      id: string;
      quantity: number;
      variant: {
        id: string;
        name: string | null;
        sku: string;
        price: Prisma.Decimal;
        oldPrice: Prisma.Decimal | null;
        currency: string;
        images: string[];
        product: {
          id: string;
          name: string;
          slug: string;
          images: string[];
        };
      };
    }>;
    updatedAt: Date | null;
  }) {
    const items = cart.items.map((item) => ({
      ...item,
      lineTotal: item.variant.price.mul(item.quantity),
    }));

    return {
      ...cart,
      items,
      subtotal: items.reduce(
        (sum, item) => sum.plus(item.lineTotal),
        new Prisma.Decimal(0),
      ),
      currency: items[0]?.variant.currency ?? null,
    };
  }
}
