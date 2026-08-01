import { ForbiddenException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DEFAULT_PAGE_SIZE } from '../../../common/dtos/pagination-query.dto';
import { PrismaService } from '../../../database/services/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { OrderStatus, StoreStatus } from '../../../generated/prisma/enums';
import { VariantUnavailableError } from '../../carts/errors/variant-unavailable.error';
import { PaymentService } from '../../payments/services/payment.service';
import { StockService } from '../../stocks/services/stock.service';
import { CurrencyMismatchError } from '../../wallets/errors/currency-mismatch.error';
import { WalletService } from '../../wallets/services/wallet.service';
import { WalletLedgerEntry } from '../../wallets/types/wallet-ledger-entry';
import { CheckoutDto } from '../dtos/checkout.dto';
import { ListOrdersQueryDto } from '../dtos/list-orders-query.dto';
import { UpdateOrderStatusDto } from '../dtos/update-order-status.dto';
import { EmptyCartError } from '../errors/empty-cart.error';
import { InvalidOrderStatusTransitionError } from '../errors/invalid-order-status-transition.error';
import { StoreNotActiveError } from '../errors/store-not-active.error';

const ORDER_SUMMARY_SELECT = {
  id: true,
  number: true,
  status: true,
  currency: true,
  subtotal: true,
  discountAmount: true,
  deliveryPrice: true,
  totalAmount: true,
  createdAt: true,
  store: { select: { id: true, name: true, slug: true } },
} as const;

const ORDER_DETAIL_SELECT = {
  ...ORDER_SUMMARY_SELECT,
  comment: true,
  cancellationReason: true,
  recipientName: true,
  recipientPhone: true,
  country: true,
  region: true,
  city: true,
  street: true,
  building: true,
  apartment: true,
  entrance: true,
  floor: true,
  postalCode: true,
  deliveryComment: true,
  trackingNumber: true,
  deliveryProvider: true,
  acceptedAt: true,
  processingAt: true,
  deliveredAt: true,
  completedAt: true,
  cancelledAt: true,
  returnedAt: true,
  items: {
    select: {
      id: true,
      productId: true,
      variantId: true,
      productName: true,
      variantName: true,
      sku: true,
      productImage: true,
      quantity: true,
      price: true,
      totalPrice: true,
      currency: true,
    },
  },
  payments: {
    select: {
      id: true,
      status: true,
      method: true,
      amount: true,
      refundedAmount: true,
      currency: true,
      paidAt: true,
      refundedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
  statusHistory: {
    select: {
      id: true,
      previousStatus: true,
      status: true,
      comment: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

const TRANSITION_SELECT = {
  id: true,
  status: true,
  profileId: true,
  currency: true,
  items: { select: { variantId: true, quantity: true } },
} as const;

type TransitionOrder = Prisma.OrderGetPayload<{
  select: typeof TRANSITION_SELECT;
}>;

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.IN_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.IN_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.RETURNED],
  [OrderStatus.COMPLETED]: [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.RETURNED]: [],
};

const STATUS_TIMESTAMP_FIELDS: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.ACCEPTED]: 'acceptedAt',
  [OrderStatus.PROCESSING]: 'processingAt',
  [OrderStatus.DELIVERED]: 'deliveredAt',
  [OrderStatus.COMPLETED]: 'completedAt',
  [OrderStatus.CANCELLED]: 'cancelledAt',
  [OrderStatus.RETURNED]: 'returnedAt',
};

const STORE_OWNER_TARGETS: OrderStatus[] = [
  OrderStatus.ACCEPTED,
  OrderStatus.PROCESSING,
  OrderStatus.IN_DELIVERY,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.RETURNED,
];

interface TransitionExtras {
  comment?: string;
  cancellationReason?: string;
  trackingNumber?: string;
  deliveryProvider?: string;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly paymentService: PaymentService,
    private readonly walletService: WalletService,
  ) {}

  // ---------------------------------------------------------------
  // Checkout
  // ---------------------------------------------------------------

  /**
   * Turns a cart into an order: snapshots product data and the delivery
   * address, reserves stock for every item and clears the cart — all in
   * one database transaction.
   */
  async checkout(accountId: string, profileId: string, dto: CheckoutDto) {
    const cart = await this.prisma.cart.findFirstOrThrow({
      select: {
        id: true,
        storeId: true,
        store: { select: { status: true, deletedAt: true } },
        items: {
          select: {
            quantity: true,
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                currency: true,
                images: true,
                attributes: true,
                status: true,
                deletedAt: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                    status: true,
                    deletedAt: true,
                  },
                },
              },
            },
          },
        },
      },
      where: { id: dto.cartId, profileId },
    });

    if (cart.items.length === 0) {
      throw new EmptyCartError();
    }

    if (cart.store.status !== StoreStatus.ACTIVE || cart.store.deletedAt) {
      throw new StoreNotActiveError();
    }

    for (const item of cart.items) {
      const { variant } = item;
      const purchasable =
        variant.status === 'ACTIVE' &&
        !variant.deletedAt &&
        variant.product.status === 'ACTIVE' &&
        !variant.product.deletedAt;

      if (!purchasable) {
        throw new VariantUnavailableError(variant.id);
      }
    }

    const currency = cart.items[0].variant.currency;
    for (const item of cart.items) {
      if (item.variant.currency !== currency) {
        throw new CurrencyMismatchError(currency, item.variant.currency);
      }
    }

    const address = await this.prisma.address.findFirstOrThrow({
      where: { id: dto.addressId, profileId },
    });

    const subtotal = cart.items.reduce(
      (sum, item) => sum.plus(item.variant.price.mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        select: ORDER_DETAIL_SELECT,
        data: {
          number: this.generateOrderNumber(),
          currency,
          subtotal,
          totalAmount: subtotal,
          comment: dto.comment,
          recipientName: address.recipientName,
          recipientPhone: address.phone,
          country: address.country,
          region: address.region,
          city: address.city,
          street: address.street,
          building: address.building,
          apartment: address.apartment,
          entrance: address.entrance,
          floor: address.floor,
          postalCode: address.postalCode,
          deliveryComment: dto.deliveryComment ?? address.comment,
          storeId: cart.storeId,
          profileId,
          items: {
            create: cart.items.map((item) => ({
              productId: item.variant.product.id,
              variantId: item.variant.id,
              productName: item.variant.product.name,
              variantName: item.variant.name,
              sku: item.variant.sku,
              productImage:
                item.variant.images[0] ?? item.variant.product.images[0],
              productAttributes:
                item.variant.attributes === null
                  ? undefined
                  : (item.variant.attributes as Prisma.InputJsonValue),
              quantity: item.quantity,
              price: item.variant.price,
              totalPrice: item.variant.price.mul(item.quantity),
              currency: item.variant.currency,
            })),
          },
          statusHistory: {
            create: {
              status: OrderStatus.PENDING,
              comment: 'Order created',
              changedByAccountId: accountId,
            },
          },
        },
      });

      for (const item of cart.items) {
        await this.stockService.reserve(
          tx,
          item.variant.id,
          item.quantity,
          order.id,
        );
      }

      await tx.cart.delete({ select: { id: true }, where: { id: cart.id } });

      return order;
    });
  }

  // ---------------------------------------------------------------
  // Buyer side
  // ---------------------------------------------------------------

  listMyOrders(profileId: string, query: ListOrdersQueryDto) {
    return this.prisma.order.findMany({
      select: ORDER_SUMMARY_SELECT,
      where: { profileId, ...(query.status ? { status: query.status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: query.take ?? DEFAULT_PAGE_SIZE,
      skip: query.skip ?? 0,
    });
  }

  getMyOrder(profileId: string, orderId: string) {
    return this.prisma.order.findFirstOrThrow({
      select: ORDER_DETAIL_SELECT,
      where: { id: orderId, profileId },
    });
  }

  /** A buyer may cancel their order only while it is still PENDING. */
  async cancelMyOrder(
    accountId: string,
    profileId: string,
    orderId: string,
    reason?: string,
  ) {
    const order = await this.prisma.order.findFirstOrThrow({
      select: TRANSITION_SELECT,
      where: { id: orderId, profileId },
    });

    if (order.status !== OrderStatus.PENDING) {
      throw new InvalidOrderStatusTransitionError(
        order.status,
        OrderStatus.CANCELLED,
      );
    }

    return this.applyTransition(order, OrderStatus.CANCELLED, accountId, {
      comment: reason,
      cancellationReason: reason,
    });
  }

  /** A buyer confirms receipt: DELIVERED -> COMPLETED. */
  async completeMyOrder(accountId: string, profileId: string, orderId: string) {
    const order = await this.prisma.order.findFirstOrThrow({
      select: TRANSITION_SELECT,
      where: { id: orderId, profileId },
    });

    return this.applyTransition(order, OrderStatus.COMPLETED, accountId, {
      comment: 'Order received by the customer',
    });
  }

  // ---------------------------------------------------------------
  // Store owner side
  // ---------------------------------------------------------------

  async listStoreOrders(
    accountId: string,
    storeId: string,
    query: ListOrdersQueryDto,
  ) {
    return this.prisma.order.findMany({
      select: ORDER_SUMMARY_SELECT,
      where: {
        storeId,
        store: { ownerId: accountId },
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.take ?? DEFAULT_PAGE_SIZE,
      skip: query.skip ?? 0,
    });
  }

  getStoreOrder(accountId: string, orderId: string) {
    return this.prisma.order.findFirstOrThrow({
      select: ORDER_DETAIL_SELECT,
      where: { id: orderId, store: { ownerId: accountId } },
    });
  }

  async changeStoreOrderStatus(
    accountId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    if (!STORE_OWNER_TARGETS.includes(dto.status)) {
      throw new ForbiddenException(
        `Store cannot move an order to status ${dto.status}`,
      );
    }

    const order = await this.prisma.order.findFirstOrThrow({
      select: TRANSITION_SELECT,
      where: { id: orderId, store: { ownerId: accountId } },
    });

    return this.applyTransition(order, dto.status, accountId, {
      comment: dto.comment,
      cancellationReason:
        dto.status === OrderStatus.CANCELLED ? dto.comment : undefined,
      trackingNumber: dto.trackingNumber,
      deliveryProvider: dto.deliveryProvider,
    });
  }

  // ---------------------------------------------------------------
  // Status machine
  // ---------------------------------------------------------------

  /**
   * Applies a status transition together with its side effects: stock
   * reservations are released/committed/returned and wallet payments are
   * refunded where the transition requires it. Everything runs in one
   * database transaction; wallet events are published after commit.
   */
  private async applyTransition(
    order: TransitionOrder,
    nextStatus: OrderStatus,
    actorAccountId: string,
    extras: TransitionExtras,
  ) {
    if (!ALLOWED_TRANSITIONS[order.status].includes(nextStatus)) {
      throw new InvalidOrderStatusTransitionError(order.status, nextStatus);
    }

    const refundEntries: WalletLedgerEntry[] = [];

    const updated = await this.prisma.$transaction(async (tx) => {
      // Optimistic guard: the transition only happens if the order is still
      // in the status we validated against.
      const guarded = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: nextStatus },
      });

      if (guarded.count === 0) {
        throw new InvalidOrderStatusTransitionError(order.status, nextStatus);
      }

      await this.applyStockEffects(tx, order, nextStatus);

      if (
        nextStatus === OrderStatus.CANCELLED ||
        nextStatus === OrderStatus.RETURNED
      ) {
        refundEntries.push(
          ...(await this.paymentService.refundOrderPayments(tx, order)),
        );
      }

      const timestampField = STATUS_TIMESTAMP_FIELDS[nextStatus];

      const result = await tx.order.update({
        select: ORDER_DETAIL_SELECT,
        where: { id: order.id },
        data: {
          ...(timestampField ? { [timestampField]: new Date() } : {}),
          cancellationReason: extras.cancellationReason,
          trackingNumber: extras.trackingNumber,
          deliveryProvider: extras.deliveryProvider,
        },
      });

      await tx.orderStatusHistory.create({
        select: { id: true },
        data: {
          orderId: order.id,
          previousStatus: order.status,
          status: nextStatus,
          comment: extras.comment,
          changedByAccountId: actorAccountId,
        },
      });

      return result;
    });

    for (const entry of refundEntries) {
      this.walletService.publishLedgerEvent(order.profileId, entry);
    }

    return updated;
  }

  private async applyStockEffects(
    tx: Prisma.TransactionClient,
    order: TransitionOrder,
    nextStatus: OrderStatus,
  ): Promise<void> {
    const items = order.items.filter(
      (item): item is { variantId: string; quantity: number } =>
        item.variantId !== null,
    );

    for (const item of items) {
      switch (nextStatus) {
        case OrderStatus.CANCELLED:
          await this.stockService.release(
            tx,
            item.variantId,
            item.quantity,
            order.id,
          );
          break;
        case OrderStatus.DELIVERED:
          await this.stockService.commitSale(
            tx,
            item.variantId,
            item.quantity,
            order.id,
          );
          break;
        case OrderStatus.RETURNED:
          await this.stockService.returnToStock(
            tx,
            item.variantId,
            item.quantity,
            order.id,
          );
          break;
        default:
          break;
      }
    }
  }

  private generateOrderNumber(): string {
    const time = Date.now().toString(36).toUpperCase();
    const random = randomBytes(3).toString('hex').toUpperCase();

    return `ORD-${time}-${random}`;
  }
}
