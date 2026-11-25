import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChitPayment extends Document {
  paymentId: string;
  chitCustomerId: string;
  customerRef: Types.ObjectId;
  allocationId: string;
  allocationRef: Types.ObjectId;
  installmentId?: Types.ObjectId;
  installmentNumber: number;
  paymentMonth: string;
  amountDue: number;
  amountReceived: number;
  paymentDate: Date;
  paymentDateStr: string;
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer';
  transactionReference?: string;
  paymentTimingStatus: 'On Time' | 'Advance' | 'Delay';
  notes?: string;
  receiptId: string;
  createdAt: Date;
}

const ChitPaymentSchema: Schema = new Schema(
  {
    paymentId: { type: String, required: true, unique: true, index: true },
    chitCustomerId: { type: String, required: true, index: true },
    customerRef: { type: Schema.Types.ObjectId, ref: 'ChitCustomer', required: true, index: true },
    allocationId: { type: String, required: true, index: true },
    allocationRef: { type: Schema.Types.ObjectId, ref: 'ChitAllocation', required: true, index: true },
    installmentId: { type: Schema.Types.ObjectId },
    installmentNumber: { type: Number, required: true },
    paymentMonth: { type: String, required: true },
    amountDue: { type: Number, required: true },
    amountReceived: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    paymentDateStr: { type: String, required: true },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer'], default: 'Cash' },
    transactionReference: { type: String, default: '', trim: true },
    paymentTimingStatus: { type: String, enum: ['On Time', 'Advance', 'Delay'], default: 'On Time' },
    notes: { type: String, default: '', trim: true },
    receiptId: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ChitPayment = mongoose.model<IChitPayment>('ChitPayment', ChitPaymentSchema);
