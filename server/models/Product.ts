import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  slNo: number;
  sku?: string;
  name: string;
  category?: string;
  rate?: number;
  mrp?: number;
  unit?: string;
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
  },
  { timestamps: true, strict: false }
);

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
