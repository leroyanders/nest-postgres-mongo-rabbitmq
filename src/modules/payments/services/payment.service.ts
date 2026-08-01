import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/services/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../generated/prisma/enums';
import { WalletService } from '../../wallets/services/wallet.service';
import { IWalletLedgerEntry } from '../../wallets/types/wallet-ledger-entry';
import { PayOrderDto } from '../dtos/pay-order.dto';
import { OrderAlreadyPaidError } from '../errors/order-already-paid.error';
import { OrderNotPayableError } from '../errors/order-not-payable.error';

const PAYMENT_SELECT = {
  id: true,
  status: true,
  method: true,
  provider: true,
  amount: true,
  refundedAmount: true,
  currency: true,
  idempotencyKey: true,
  createdAt: true,
  paidAt: true,
  refundedAt: true,
} as const;

const PAYABLE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.ACCEPTED,
  OrderStatus.PROCESSING,
];

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Pays an order from the buyer's wallet. The wallet debit, the ledger
   * entry and the payment record are created in one database transaction.
   */
  async payOrder(profileId: string, dto: PayOrderDto) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        select: PAYMENT_SELECT,
        where: { idempotencyKey: dto.idempotencyKey },
      });

      if (existing) {
        return existing;
      }
    }

    const order = await this.prisma.order.findFirstOrThrow({
      select: {
        id: true,
        status: true,
        totalAmount: true,
        currency: true,
      },
      where: { id: dto.orderId, profileId },
    });

    if (!PAYABLE_STATUSES.includes(order.status)) {
      throw new OrderNotPayableError(order.status);
    }

    const { payment, ledgerEntry } = await this.prisma.$transaction(
      async (tx) => {
        const alreadyPaid = await tx.payment.count({
          where: {
            orderId: order.id,
            status: { in: [PaymentStatus.PAID, PaymentStatus.PROCESSING] },
          },
        });

        if (alreadyPaid > 0) {
          throw new OrderAlreadyPaidError();
        }

        const entry = await this.walletService.chargeOrderPayment(
          tx,
          profileId,
          order.totalAmount,
          order.currency,
          order.id,
        );

        const created = await tx.payment.create({
          select: PAYMENT_SELECT,
          data: {
            orderId: order.id,
            method: PaymentMethod.WALLET,
            provider: 'wallet',
            status: PaymentStatus.PAID,
            amount: order.totalAmount,
            currency: order.currency,
            idempotencyKey: dto.idempotencyKey,
            paidAt: new Date(),
          },
        });

        return { payment: created, ledgerEntry: entry };
      },
    );

    this.walletService.publishLedgerEvent(profileId, ledgerEntry);

    return payment;
  }

  listOrderPayments(profileId: string, orderId: string) {
    return this.prisma.payment.findMany({
      select: PAYMENT_SELECT,
      where: { orderId, order: { profileId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Refunds all wallet payments of an order back to the buyer. Runs inside
   * the caller's transaction; the caller publishes the returned ledger
   * entries after commit.
   */
  async refundOrderPayments(
    tx: Prisma.TransactionClient,
    order: { id: string; profileId: string; currency: string },
  ): Promise<IWalletLedgerEntry[]> {
    const payments = await tx.payment.findMany({
      select: { id: true, amount: true, refundedAmount: true },
      where: {
        orderId: order.id,
        method: PaymentMethod.WALLET,
        status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] },
      },
    });

    const entries: IWalletLedgerEntry[] = [];

    for (const payment of payments) {
      const remaining = payment.amount.minus(payment.refundedAmount);

      if (remaining.lessThanOrEqualTo(0)) {
        continue;
      }

      entries.push(
        await this.walletService.refundOrderPayment(
          tx,
          order.profileId,
          remaining,
          order.currency,
          order.id,
        ),
      );

      await tx.payment.update({
        select: { id: true },
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
          refundedAmount: payment.amount,
          refundedAt: new Date(),
        },
      });
    }

    return entries;
  }
}
