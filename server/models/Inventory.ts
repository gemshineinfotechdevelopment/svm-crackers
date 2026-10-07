import mongoose, { Schema, Document } from 'mongoose';

export interface IInventory extends Document {
  sku?: string;
  productName: string;
  shopStock?: number;
  godownStock?: number;
  totalStock?: number;
  stock?: number;
  unit?: string;
  category?: string;
  rate?: number;
  mrp?: number;
  costPrice?: number;
  minStockAlert?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const InventorySchema: Schema = new Schema(
  {
    sku: { type: String, trim: true, sparse: true },
    productName: { type: String, required: true, trim: true },
    shopStock: { type: Number, default: 0 },
    godownStock: { type: Number, default: 0 },
    totalStock: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    unit: { type: String, trim: true, default: 'Box' },
    category: { type: String, trim: true, default: 'General' },
    rate: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    minStockAlert: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    strict: false,
    collection: 'inventories',
  }
);

InventorySchema.index({ productName: 1 });
InventorySchema.index({ sku: 1 });

export const Inventory = mongoose.model<IInventory>('Inventory', InventorySchema, 'inventories');
export default Inventory;
