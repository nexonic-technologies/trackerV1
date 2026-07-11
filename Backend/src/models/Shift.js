import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  startTime: { type: String, required: true }, // Format: "09:00"
  endTime: { type: String, required: true },   // Format: "18:00"
  breakDuration: { type: Number, default: 60 }, // Minutes
  workingHours: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  description: { type: String },
  allowedLateness: { type: Number, default: 15 }, // Minutes
  overtimeThreshold: { type: Number, default: 480 }, // Minutes (8 hours)
  weeklyOff: [{ 
    type: String, 
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] 
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true }
}, {
  timestamps: true
});

const shiftAssignmentSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true }
}, {
  timestamps: true
});

// Indexes
shiftSchema.index({ isActive: 1 });

shiftAssignmentSchema.index({ employeeId: 1, isActive: 1 });
shiftAssignmentSchema.index({ shiftId: 1, startDate: 1 });
shiftAssignmentSchema.index({ startDate: 1, endDate: 1 });

export const Shift = mongoose.model('Shift', shiftSchema);
export const ShiftAssignment = mongoose.model('ShiftAssignment', shiftAssignmentSchema);

export default { Shift, ShiftAssignment };