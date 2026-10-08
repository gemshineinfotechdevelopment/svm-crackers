import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  companyName: string;
  tagline?: string;
  ownerName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  state?: string;
  gstin?: string;
  pan?: string;
  logoUrl?: string;
  enableTax?: boolean;
  defaultTaxRate?: string;
  gstTurnoverBaseline?: string;
  gstTurnoverCurrent?: string;
  billingYear?: number;
  billingStartDate?: string;
  billingEndDate?: string;
  billingStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema: Schema = new Schema(
  {
    companyName: { type: String, default: 'SVM Crackers', trim: true },
    tagline: { type: String, default: 'Standard Fire Works & Fancy Crackers', trim: true },
    ownerName: { type: String, default: '', trim: true },
    phone: { type: String, default: '9843067073', trim: true },
    whatsapp: { type: String, default: '8778429299', trim: true },
    email: { type: String, default: '', trim: true },
    address: { type: String, default: '67 - H/E, Rajivgandhi Nagar, Near Ramji Polypack, Sivakasi Bus Stand , Sivakasi', trim: true },
    city: { type: String, default: 'Sivakasi', trim: true },
    pincode: { type: String, default: '626123', trim: true },
    state: { type: String, default: 'Tamil Nadu', trim: true },
    gstin: { type: String, default: '', trim: true },
    pan: { type: String, default: '', trim: true },
    logoUrl: { type: String, default: '' },
    enableTax: { type: Boolean, default: false },
    defaultTaxRate: { type: String, default: '18' },
    gstTurnoverBaseline: { type: String, default: '726900.00', trim: true },
    gstTurnoverCurrent: { type: String, default: '726900.00', trim: true },
    billingYear: { type: Number, default: () => new Date().getFullYear() },
    billingStartDate: { type: String, default: () => `01-01-${new Date().getFullYear()}` },
    billingEndDate: { type: String, default: () => `31-12-${new Date().getFullYear()}` },
    billingStatus: { type: String, default: 'Active', trim: true },
  },
  { timestamps: true, strict: false }
);

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
