import mongoose, { Schema, Document } from 'mongoose';

export interface IChitCounter extends Document {
  key: string;
  seq: number;
}

const ChitCounterSchema: Schema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const ChitCounter = mongoose.model<IChitCounter>('ChitCounter', ChitCounterSchema);

export async function getNextChitSeq(key: string): Promise<number> {
  const result = await ChitCounter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result ? result.seq : 1;
}
