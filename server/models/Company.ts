import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  slNo?: string;
  name: string;
  avatarLetter?: string;
  avatarBg?: string;
  avatarColor?: string;
  address: string;
  gstin: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema: Schema = new Schema(
  {
    slNo: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    avatarLetter: { type: String, trim: true },
    avatarBg: { type: String, default: '#DBEAFE' },
    avatarColor: { type: String, default: '#0B4DB7' },
    address: { type: String, required: true, trim: true },
    gstin: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
