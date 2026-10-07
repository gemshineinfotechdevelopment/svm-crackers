import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  idCode?: string;
  name: string;
  avatarLetter?: string;
  avatarBg?: string;
  avatarColor?: string;
  address: string;
  mobile: string;
  gst: string;
  aadhar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema: Schema = new Schema(
  {
    idCode: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    avatarLetter: { type: String, trim: true },
    avatarBg: { type: String, default: '#DBEAFE' },
    avatarColor: { type: String, default: '#0B4DB7' },
    address: { type: String, default: '-', trim: true },
    mobile: { type: String, default: '-', trim: true },
    gst: { type: String, default: 'N/A', trim: true },
    aadhar: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
