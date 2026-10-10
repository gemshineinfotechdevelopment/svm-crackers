import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceMapRate {
  productId?: string;
  code: number | string;
  productName: string;
  quantity: number;
  rate: number;
}

export interface IPriceMap extends Document {
  name: string;
  description?: string;
  rates: IPriceMapRate[];
  year?: number | string;
  createdAt: Date;
  updatedAt: Date;
}

const PriceMapRateSchema = new Schema(
  {
    productId: { type: String, trim: true },
    code: { type: Schema.Types.Mixed, required: true },
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
  },
  { _id: false }
);

const PriceMapSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Price Map name is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    rates: {
      type: [PriceMapRateSchema],
      default: [],
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

PriceMapSchema.index({ name: 1, year: 1 }, { unique: true });

export const PriceMap = mongoose.model<IPriceMap>('PriceMap', PriceMapSchema);
export default PriceMap;
