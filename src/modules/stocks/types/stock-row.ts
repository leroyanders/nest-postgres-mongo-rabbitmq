export interface UpdatedStockRow {
  id: string;
  quantity: bigint;
  reservedQuantity: bigint;
}

export interface StockView {
  id: string;
  variantId: string;
  quantity: number;
  reservedQuantity: number;
  available: number;
  minQuantity: number;
  isActive: boolean;
}
