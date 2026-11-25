import mongoose, { Schema, Document } from 'mongoose';

export interface IChitCustomer extends Document {
  chitCustomerId: string;
  name: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  address: string;
  city: string;
  notes?: string;
  status: 'Active' | 'Inactive' | 'Closed';
  createdAt: Date;
  updatedAt: Date;
}

const ChitCustomerSchema: Schema = new Schema(
  {
    chitCustomerId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    mobile: { type: String, required: true, trim: true, index: true },
    whatsapp: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    address: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    status: { type: String, enum: ['Active', 'Inactive', 'Closed'], default: 'Active', index: true },
  },
  { timestamps: true }
);

export const ChitCustomer = mongoose.model<IChitCustomer>('ChitCustomer', ChitCustomerSchema);
