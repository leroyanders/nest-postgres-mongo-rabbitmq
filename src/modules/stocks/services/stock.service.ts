import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/services/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { StockMovementType } from '../../../generated/prisma/enums';
import { StoreService } from '../../stores/services/store.service';
import { AdjustStockDto } from '../dtos/adjust-stock.dto';
import { UpdateStockDto } from '../dtos/update-stock.dto';
import { InsufficientStockError } from '../errors/insufficient-stock.error';
import { InvalidStockAdjustmentError } from '../errors/invalid-stock-adjustment.error';
import { StockView, UpdatedStockRow } from '../types/stock-row';

interface MovementContext {
  orderId?: string;
  reason?: string;
}

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeService: StoreService,
  ) {}

  // ---------------------------------------------------------------
  // Store owner management
  // ---------------------------------------------------------------

  async listStoreStocks(accountId: string, storeId: string) {
    await this.storeService.requireOwnedStore(accountId, storeId);

    const stocks = await this.prisma.stock.findMany({
      select: {
        id: true,
        variantId: true,
        quantity: true,
        reservedQuantity: true,
        minQuantity: true,
        isActive: true,
        variant: {
          select: {
            sku: true,
            name: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      where: { storeId },
      orderBy: { updatedAt: 'desc' },
    });

    return stocks.map((stock) => ({
      ...this.toView(stock),
      variant: stock.variant,
    }));
  }

  async listMovements(accountId: string, stockId: string) {
    await this.prisma.stock.findFirstOrThrow({
      select: { id: true },
      where: { id: stockId, store: { ownerId: accountId } },
    });

    const movements = await this.prisma.stockMovement.findMany({
      where: { stockId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return movements.map((movement) => ({
      id: movement.id,
      type: movement.type,
      quantity: Number(movement.quantity),
      quantityBefore: Number(movement.quantityBefore),
      quantityAfter: Number(movement.quantityAfter),
      reservedBefore: Number(movement.reservedBefore),
      reservedAfter: Number(movement.reservedAfter),
      reason: movement.reason,
      orderId: movement.orderId,
      createdAt: movement.createdAt,
    }));
  }

  /**
   * Manual stock adjustment by the store owner. INCOME adds the given
   * quantity, WRITE_OFF removes it, CORRECTION sets the absolute value.
   * The available quantity can never drop below what is reserved.
   */
  async adjustStock(
    accountId: string,
    dto: AdjustStockDto,
  ): Promise<StockView> {
    const variant = await this.prisma.productVariant.findFirstOrThrow({
      select: { id: true, product: { select: { storeId: true } } },
      where: {
        id: dto.variantId,
        deletedAt: null,
        product: { store: { ownerId: accountId, deletedAt: null } },
      },
    });

    if (dto.type !== StockMovementType.CORRECTION && dto.quantity === 0) {
      throw new InvalidStockAdjustmentError(
        'quantity must be greater than 0 for INCOME and WRITE_OFF',
      );
    }

    const storeId = variant.product.storeId;

    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.stock.upsert({
        select: {
          id: true,
          quantity: true,
          reservedQuantity: true,
          minQuantity: true,
          isActive: true,
          variantId: true,
        },
        where: { variantId: dto.variantId },
        create: { variantId: dto.variantId, storeId },
        update: {},
      });

      const quantity = BigInt(dto.quantity);
      const nextQuantity = this.nextQuantity(
        stock.quantity,
        quantity,
        dto.type,
      );

      if (nextQuantity < stock.reservedQuantity || nextQuantity < 0n) {
        throw new InvalidStockAdjustmentError(
          'Resulting quantity cannot drop below the reserved quantity',
        );
      }

      const updated = await tx.stock.update({
        select: {
          id: true,
          quantity: true,
          reservedQuantity: true,
          minQuantity: true,
          isActive: true,
          variantId: true,
        },
        where: { id: stock.id },
        data: { quantity: nextQuantity },
      });

      await tx.stockMovement.create({
        select: { id: true },
        data: {
          stockId: stock.id,
          type: dto.type,
          quantity,
          quantityBefore: stock.quantity,
          quantityAfter: nextQuantity,
          reservedBefore: stock.reservedQuantity,
          reservedAfter: stock.reservedQuantity,
          reason: dto.reason,
        },
      });

      return this.toView(updated);
    });
  }

  async updateStock(
    accountId: string,
    stockId: string,
    dto: UpdateStockDto,
  ): Promise<StockView> {
    await this.prisma.stock.findFirstOrThrow({
      select: { id: true },
      where: { id: stockId, store: { ownerId: accountId } },
    });

    const updated = await this.prisma.stock.update({
      select: {
        id: true,
        quantity: true,
        reservedQuantity: true,
        minQuantity: true,
        isActive: true,
        variantId: true,
      },
      where: { id: stockId },
      data: {
        minQuantity:
          dto.minQuantity === undefined ? undefined : BigInt(dto.minQuantity),
        isActive: dto.isActive,
      },
    });

    return this.toView(updated);
  }

  // ---------------------------------------------------------------
  // Order lifecycle operations (run inside the caller's transaction)
  // ---------------------------------------------------------------

  async reserve(
    tx: Prisma.TransactionClient,
    variantId: string,
    quantity: number,
    orderId?: string,
  ): Promise<void> {
    const amount = BigInt(quantity);
    const rows = await tx.$queryRaw<UpdatedStockRow[]>`
      UPDATE "stocks"
      SET "reservedQuantity" = "reservedQuantity" + ${amount}, "updatedAt" = now()
      WHERE "variantId" = ${variantId}::uuid
        AND "isActive" = true
        AND "quantity" - "reservedQuantity" >= ${amount}
      RETURNING "id", "quantity", "reservedQuantity"
    `;

    const row = rows[0];
    if (!row) {
      throw new InsufficientStockError(variantId);
    }

    await this.recordMovement(tx, row, StockMovementType.RESERVE, amount, {
      quantityDelta: 0n,
      reservedDelta: amount,
      context: { orderId },
    });
  }

  async release(
    tx: Prisma.TransactionClient,
    variantId: string,
    quantity: number,
    orderId?: string,
  ): Promise<void> {
    const amount = BigInt(quantity);
    const rows = await tx.$queryRaw<UpdatedStockRow[]>`
      UPDATE "stocks"
      SET "reservedQuantity" = "reservedQuantity" - ${amount}, "updatedAt" = now()
      WHERE "variantId" = ${variantId}::uuid
        AND "reservedQuantity" >= ${amount}
      RETURNING "id", "quantity", "reservedQuantity"
    `;

    const row = rows[0];
    if (!row) {
      throw new InsufficientStockError(variantId);
    }

    await this.recordMovement(tx, row, StockMovementType.RELEASE, amount, {
      quantityDelta: 0n,
      reservedDelta: -amount,
      context: { orderId },
    });
  }

  async commitSale(
    tx: Prisma.TransactionClient,
    variantId: string,
    quantity: number,
    orderId?: string,
  ): Promise<void> {
    const amount = BigInt(quantity);
    const rows = await tx.$queryRaw<UpdatedStockRow[]>`
      UPDATE "stocks"
      SET "quantity" = "quantity" - ${amount},
          "reservedQuantity" = "reservedQuantity" - ${amount},
          "updatedAt" = now()
      WHERE "variantId" = ${variantId}::uuid
        AND "reservedQuantity" >= ${amount}
        AND "quantity" >= ${amount}
      RETURNING "id", "quantity", "reservedQuantity"
    `;

    const row = rows[0];
    if (!row) {
      throw new InsufficientStockError(variantId);
    }

    await this.recordMovement(tx, row, StockMovementType.SALE, amount, {
      quantityDelta: -amount,
      reservedDelta: -amount,
      context: { orderId },
    });
  }

  async returnToStock(
    tx: Prisma.TransactionClient,
    variantId: string,
    quantity: number,
    orderId?: string,
  ): Promise<void> {
    const amount = BigInt(quantity);
    const rows = await tx.$queryRaw<UpdatedStockRow[]>`
      UPDATE "stocks"
      SET "quantity" = "quantity" + ${amount}, "updatedAt" = now()
      WHERE "variantId" = ${variantId}::uuid
      RETURNING "id", "quantity", "reservedQuantity"
    `;

    const row = rows[0];
    if (!row) {
      throw new InsufficientStockError(variantId);
    }

    await this.recordMovement(tx, row, StockMovementType.RETURN, amount, {
      quantityDelta: amount,
      reservedDelta: 0n,
      context: { orderId },
    });
  }

  private recordMovement(
    tx: Prisma.TransactionClient,
    row: UpdatedStockRow,
    type: StockMovementType,
    amount: bigint,
    options: {
      quantityDelta: bigint;
      reservedDelta: bigint;
      context: MovementContext;
    },
  ) {
    return tx.stockMovement.create({
      select: { id: true },
      data: {
        stockId: row.id,
        type,
        quantity: amount,
        quantityBefore: row.quantity - options.quantityDelta,
        quantityAfter: row.quantity,
        reservedBefore: row.reservedQuantity - options.reservedDelta,
        reservedAfter: row.reservedQuantity,
        orderId: options.context.orderId,
        reason: options.context.reason,
      },
    });
  }

  private nextQuantity(
    current: bigint,
    amount: bigint,
    type: StockMovementType,
  ): bigint {
    switch (type) {
      case StockMovementType.INCOME:
        return current + amount;
      case StockMovementType.WRITE_OFF:
        return current - amount;
      default:
        return amount;
    }
  }

  private toView(stock: {
    id: string;
    variantId: string;
    quantity: bigint;
    reservedQuantity: bigint;
    minQuantity: bigint;
    isActive: boolean;
  }): StockView {
    return {
      id: stock.id,
      variantId: stock.variantId,
      quantity: Number(stock.quantity),
      reservedQuantity: Number(stock.reservedQuantity),
      available: Number(stock.quantity - stock.reservedQuantity),
      minQuantity: Number(stock.minQuantity),
      isActive: stock.isActive,
    };
  }
}
