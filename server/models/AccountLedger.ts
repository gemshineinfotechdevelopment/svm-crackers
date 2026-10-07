import mongoose, { Schema, Document } from 'mongoose';

export interface IAccountLedger extends Document {
  particularId?: string;
  billNo?: string;
  customerName: string;
  date: string;
  companyName: string;
  debit: string;
  credit: string;
  balance: string;
  type: 'BILL' | 'CREDIT' | 'PAYMENT';
  createdAt: Date;
  updatedAt: Date;
}

const AccountLedgerSchema: Schema = new Schema(
  {
    particularId: { type: String, trim: true },
    billNo: { type: String, trim: true },
    customerName: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    companyName: { type: String, required: true, trim: true },
    debit: { type: String, default: '0.00' },
    credit: { type: String, default: '0.00' },
    balance: { type: String, default: '0.00' },
    type: { type: String, enum: ['BILL', 'CREDIT', 'PAYMENT'], default: 'BILL' },
  },
  { timestamps: true }
);

export const AccountLedger = mongoose.model<IAccountLedger>('AccountLedger', AccountLedgerSchema);
