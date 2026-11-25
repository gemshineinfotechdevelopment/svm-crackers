import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChitInstallment {
  _id?: Types.ObjectId;
  installmentNumber: number;
  monthLabel: string;
  dueDate: Date;
  dueDateStr: string;
  amountDue: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'Pending' | 'Partial' | 'Paid';
  lastPaymentDate?: Date | null;
  lastPaymentDateStr?: string | null;
}

export interface IChitAllocation extends Document {
  allocationId: string;
  chitCustomerId: string;
  customerRef: Types.ObjectId;
  schemeName: string;
  monthlyAmountPerPerson: number;
  personCount: number;
  totalMonthlyAmount: number;
  duration: number;
  startMonth: string;
  dueDay: number;
  totalChitValue: number;
  bonusDetails?: string;
  giftDetails?: string;
  status: 'Active' | 'Completed' | 'Closed';
  installments: Types.DocumentArray<any> | IChitInstallment[];
  createdAt: Date;
  updatedAt: Date;
}

const ChitInstallmentSchema: Schema = new Schema(
  {
    installmentNumber: { type: Number, required: true },
    monthLabel: { type: String, required: true },
    dueDate: { type: Date, required: true },
    dueDateStr: { type: String, required: true },
    amountDue: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
    lastPaymentDate: { type: Date, default: null },
    lastPaymentDateStr: { type: String, default: null },
  },
  { _id: true }
);

const ChitAllocationSchema: Schema = new Schema(
  {
    allocationId: { type: String, required: true, unique: true, index: true },
    chitCustomerId: { type: String, required: true, index: true },
    customerRef: { type: Schema.Types.ObjectId, ref: 'ChitCustomer', required: true, index: true },
    schemeName: { type: String, required: true, trim: true },
    monthlyAmountPerPerson: { type: Number, required: true },
    personCount: { type: Number, required: true, default: 1 },
    totalMonthlyAmount: { type: Number, required: true },
    duration: { type: Number, required: true, default: 10 },
    startMonth: { type: String, required: true },
    dueDay: { type: Number, default: 10 },
    totalChitValue: { type: Number, required: true },
    bonusDetails: { type: String, default: '', trim: true },
    giftDetails: { type: String, default: '', trim: true },
    status: { type: String, enum: ['Active', 'Completed', 'Closed'], default: 'Active', index: true },
    installments: [ChitInstallmentSchema],
  },
  { timestamps: true }
);

export const ChitAllocation = mongoose.model<IChitAllocation>('ChitAllocation', ChitAllocationSchema);
