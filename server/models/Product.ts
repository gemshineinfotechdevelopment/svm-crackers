import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  slNo: number;
  sku?: string;
  name: string;
  category?: string;
  rate?: number;
  mrp?: number;
  unit?: string;
  productType?: 'Retail' | 'Wholesale' | 'Both' | string;
  year?: number | string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    slNo: { type: Number, required: true },
    sku: { type: String, trim: true, sparse: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'General' },
    rate: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    unit: { type: String, default: 'Box' },
    productType: {
      type: String,
      enum: ['Retail', 'Wholesale', 'Both'],
      default: 'Retail',
      trim: true,
    },
    year: { type: Schema.Types.Mixed, default: () => new Date().getFullYear(), index: true },
  },
  { timestamps: true, strict: false }
);

ProductSchema.index({ productType: 1, name: 1 });
ProductSchema.index({ year: 1, slNo: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
