import mongoose, { Schema, Document } from 'mongoose';

export interface IParticularProductItem {
  particular: string;
  quantity: string;
  rate: string;
  pktUnit: string;
  amount: string;
  hsnCode?: string;
  gstRate?: string;
  taxableAmount?: string;
  cgst?: string;
  sgst?: string;
  igst?: string;
}

export interface IParticular extends Document {
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGst?: string;
  customerAadhar?: string;
  caseCount: string;
  companyName: string;
  discount: string;
  transport: string;
  packing: string;
  billNo: string;
  tax: string;
  amount: string;
  total: string;
  paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
  paymentMode?: 'CASH' | 'UPI' | 'BANK' | 'CREDIT';
  paidAmount?: string;
  notes?: string;
  date: string;
  pdfData?: string;
  pdfName?: string;
  pdfPublicId?: string;
  products: IParticularProductItem[];
  // GST Specific Fields
  billType?: 'REGULAR' | 'GST';
  placeOfSupply?: string;
  reverseCharge?: string;
  vehicleNo?: string;
  ewayBillNo?: string;
  gstRate?: string;
  cgstTotal?: string;
  sgstTotal?: string;
  igstTotal?: string;
  roundOff?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParticularProductItemSchema: Schema = new Schema({
  particular: { type: String, required: true },
  quantity: { type: String, default: '' },
  rate: { type: String, default: '' },
  pktUnit: { type: String, default: '' },
  amount: { type: String, default: '' },
  hsnCode: { type: String, default: '' },
  gstRate: { type: String, default: '' },
  taxableAmount: { type: String, default: '' },
  cgst: { type: String, default: '' },
  sgst: { type: String, default: '' },
  igst: { type: String, default: '' },
});

const ParticularSchema: Schema = new Schema(
  {
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, default: '' },
    customerAddress: { type: String, default: '' },
    customerGst: { type: String, default: '' },
    customerAadhar: { type: String, default: '' },
    caseCount: { type: String, default: '0' },
    companyName: { type: String, required: true, trim: true },
    discount: { type: String, default: '' },
    transport: { type: String, default: '' },
    packing: { type: String, default: '' },
    billNo: { type: String, required: true, trim: true },
    tax: { type: String, default: '' },
    amount: { type: String, default: '0.00' },
    total: { type: String, default: '0.00' },
    paymentStatus: { type: String, enum: ['PAID', 'UNPAID', 'PARTIAL'], default: 'UNPAID' },
    paymentMode: { type: String, enum: ['CASH', 'UPI', 'BANK', 'CREDIT'], default: 'CREDIT' },
    paidAmount: { type: String, default: '0.00' },
    notes: { type: String, default: '' },
    date: { type: String, required: true },
    pdfData: { type: String, default: '' },
    pdfName: { type: String, default: '' },
    pdfPublicId: { type: String, default: '' },
    products: [ParticularProductItemSchema],
    // GST Specific Fields
    billType: { type: String, enum: ['REGULAR', 'GST'], default: 'REGULAR' },
    placeOfSupply: { type: String, default: '' },
    reverseCharge: { type: String, default: 'No' },
    vehicleNo: { type: String, default: '' },
    ewayBillNo: { type: String, default: '' },
    gstRate: { type: String, default: '18' },
    cgstTotal: { type: String, default: '0.00' },
    sgstTotal: { type: String, default: '0.00' },
    igstTotal: { type: String, default: '0.00' },
    roundOff: { type: String, default: '0.00' },
  },
  { timestamps: true }
);

export const Particular = mongoose.model<IParticular>('Particular', ParticularSchema);

