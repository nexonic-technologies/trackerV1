import mongoose from 'mongoose';

const referenceTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  Status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

referenceTypeSchema.index({ name: 1 });
referenceTypeSchema.index({ Status: 1 });

export default mongoose.model('referenceTypes', referenceTypeSchema);