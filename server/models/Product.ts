import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  slNo: number;
  sku?: string;
  name: string;
  category?: string;
  rate?: number;
  mrp?: number;
  unit?: string;
  year?: number;
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
    year: { type: Number, default: () => new Date().getFullYear(), index: true },
  },
  { timestamps: true, strict: false }
);

ProductSchema.index({ year: 1, slNo: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
