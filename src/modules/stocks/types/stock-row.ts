export interface IUpdatedStockRow {
  id: string;
  quantity: bigint;
  reservedQuantity: bigint;
}

export interface IStockView {
  id: string;
  variantId: string;
  quantity: number;
  reservedQuantity: number;
  available: number;
  minQuantity: number;
  isActive: boolean;
}
