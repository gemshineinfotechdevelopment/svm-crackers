import mongoose, { Schema, Document } from 'mongoose';

export interface IChitReceipt extends Document {
  receiptNumber: string;
  paymentId: string;
  chitCustomerId: string;
  allocationId: string;
  receiptDataSnapshot: Record<string, any>;
  createdAt: Date;
}

const ChitReceiptSchema: Schema = new Schema(
  {
    receiptNumber: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String, required: true, index: true },
    chitCustomerId: { type: String, required: true, index: true },
    allocationId: { type: String, required: true, index: true },
    receiptDataSnapshot: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ChitReceipt = mongoose.model<IChitReceipt>('ChitReceipt', ChitReceiptSchema);
