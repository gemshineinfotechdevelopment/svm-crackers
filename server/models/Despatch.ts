import mongoose, { Schema, Document } from 'mongoose';

export interface IDespatch extends Document {
  sNo: number | string;
  date: string;
  partyName: string;
  place: string;
  bundles: number | string;
  transport: string;
  lrNo: string;
  partyNo: string;
  agent: string;
  billNo?: string;
  billType?: 'GST' | 'REGULAR' | 'MANUAL';
  billId?: mongoose.Types.ObjectId | string;
  year?: number | string;
  status?: 'DESPATCHED' | 'IN_TRANSIT' | 'DELIVERED';
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DespatchSchema: Schema = new Schema(
  {
    sNo: { type: Schema.Types.Mixed, required: true },
    date: { type: String, required: true },
    partyName: { type: String, required: true, trim: true },
    place: { type: String, default: '', trim: true },
    bundles: { type: Schema.Types.Mixed, default: '1' },
    transport: { type: String, default: '', trim: true },
    lrNo: { type: String, default: '', trim: true },
    partyNo: { type: String, default: '', trim: true },
    agent: { type: String, default: '', trim: true },
    billNo: { type: String, default: '', trim: true },
    billType: { type: String, default: 'MANUAL' },
    billId: { type: Schema.Types.ObjectId, ref: 'Particular', default: null },
    year: { type: Schema.Types.Mixed, index: true, default: () => new Date().getFullYear() },
    status: { type: String, default: 'DESPATCHED' },
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

DespatchSchema.index({ year: 1, sNo: 1 });
DespatchSchema.index({ partyName: 1 });
DespatchSchema.index({ transport: 1 });
DespatchSchema.index({ lrNo: 1 });
DespatchSchema.index({ agent: 1 });

export const Despatch = mongoose.model<IDespatch>('Despatch', DespatchSchema);
