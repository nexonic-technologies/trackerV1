import mongoose from 'mongoose';

const auditEventSchema = new mongoose.Schema({
  event:       { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  timestamp:   { type: Date, default: Date.now },
  note:        { type: String }
}, { _id: false });

const payrollRunSchema = new mongoose.Schema({
  month:             { type: Number, required: true, min: 1, max: 12 },
  year:              { type: Number, required: true },
  status:            { type: String, enum: ['Draft', 'Processing', 'Computed', 'Approved', 'Paid'], default: 'Draft' },
  employeeIds:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'employees' }],
  payrollIds:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'payrolls' }],
  totalEmployees:    { type: Number, default: 0 },
  processedCount:    { type: Number, default: 0 },
  failedCount:       { type: Number, default: 0 },
  totalGross:        { type: Number, default: 0 },
  totalNet:          { type: Number, default: 0 },
  initiatedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  approvedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  approvedAt:        { type: Date },
  paidAt:            { type: Date },
  notes:             { type: String },
  payrollAuditEvents: { type: [auditEventSchema], default: [] }
}, { timestamps: true });

payrollRunSchema.index({ month: 1, year: 1 });
payrollRunSchema.index({ status: 1, createdAt: -1 });
payrollRunSchema.index({ initiatedBy: 1 });

export default mongoose.model('payrollruns', payrollRunSchema);
