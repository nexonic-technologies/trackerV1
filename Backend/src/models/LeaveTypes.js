// models/LeaveTypes.js
import { Schema, model } from 'mongoose';

const LeaveTypeSchema = new Schema({
  name: {
    type: String,
    trim: true,
    unique: true,
    required: true
  },
  description: { type: String },
  maxDaysPerMonth: { type: Number, default: 2, min: 0 },
  maxDaysPerYear: { type: Number, default: 12, min: 0 },
  carryForward: { type: Boolean, default: false },
  requiresApproval: { type: Boolean, default: true, index: true },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

// Compound indexes
LeaveTypeSchema.index({ isActive: 1, requiresApproval: 1 });
LeaveTypeSchema.index({ isActive: 1, name: 1 });

export default model('leavetypes', LeaveTypeSchema);