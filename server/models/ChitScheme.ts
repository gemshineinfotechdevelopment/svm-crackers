import mongoose, { Schema, Document } from 'mongoose';

export interface IChitScheme extends Document {
  schemeId: string;
  schemeName: string;
  startDate: string;
  durationMonths: number;
  monthlyAmount: number;
  dueDay: number;
  totalValue: number;
  status: 'Active' | 'Inactive' | 'Completed';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChitSchemeSchema: Schema = new Schema(
  {
    schemeId: { type: String, required: true, unique: true, index: true },
    schemeName: { type: String, required: true, trim: true },
    startDate: { type: String, required: true, trim: true },
    durationMonths: { type: Number, required: true, default: 9 },
    monthlyAmount: { type: Number, required: true, default: 2000 },
    dueDay: { type: Number, required: true, default: 10, min: 1, max: 31 },
    totalValue: { type: Number, required: true },
    status: { type: String, enum: ['Active', 'Inactive', 'Completed'], default: 'Active', index: true },
    description: { type: String, default: '', trim: true },
  },
  {
    timestamps: true,
  }
);

ChitSchemeSchema.index({ schemeName: 1 });

export const ChitScheme = mongoose.model<IChitScheme>('ChitScheme', ChitSchemeSchema);
