import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceListItem extends Document {
  slNo?: number;
  itemName: string;
  category: string;
  unit: string;
  mrp: number;
  discountPercent?: number;
  rate: number;
  effectiveDate?: string;
  batchName?: string;
  year?: number | string;
  createdAt: Date;
  updatedAt: Date;
}

const PriceListItemSchema: Schema = new Schema(
  {
    slNo: {
      type: Number,
      default: 1,
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    unit: {
      type: String,
      trim: true,
      default: 'Box',
    },
    mrp: {
      type: Number,
      default: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
    },
    rate: {
      type: Number,
      required: [true, 'Rate/Price is required'],
      default: 0,
    },
    effectiveDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    batchName: {
      type: String,
      trim: true,
      default: 'Standard Price List',
    },
    year: {
      type: Schema.Types.Mixed,
      default: () => new Date().getFullYear(),
      index: true,
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

PriceListItemSchema.index({ itemName: 1, category: 1 });
PriceListItemSchema.index({ year: 1, slNo: 1 });

export const PriceList = mongoose.model<IPriceListItem>('PriceList', PriceListItemSchema);
export default PriceList;
