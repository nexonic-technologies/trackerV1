import mongoose from 'mongoose';

const leadTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  Status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

leadTypeSchema.index({ name: 1 });
leadTypeSchema.index({ Status: 1 });

export default mongoose.model('leadTypes', leadTypeSchema);