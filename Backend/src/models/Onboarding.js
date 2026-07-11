import mongoose from 'mongoose';

/**
 * Onboarding — tracks employee onboarding checklist post-hire.
 * Linked from Candidate (after Hired) or directly created by HR.
 */
const checklistItemSchema = new mongoose.Schema({
  task:         { type: String, required: true },
  category:     { type: String, enum: ['Documents', 'IT Setup', 'HR Formalities', 'Training', 'Asset Allocation', 'Other'], default: 'Other' },
  isCompleted:  { type: Boolean, default: false },
  completedAt:  { type: Date },
  completedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  dueDate:      { type: Date },
  note:         { type: String },
  
  // Document verification extension
  documentType: { type: String }, // e.g. 'Resume', 'Photo', 'PAN', 'Aadhaar', etc.
  fileUrl:      { type: String },
  verified:     { type: Boolean, default: false },
  verifiedAt:   { type: Date },
  verifiedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'employees' }
}, { _id: true });

const onboardingSchema = new mongoose.Schema({
  employeeId:    { type: mongoose.Schema.Types.ObjectId, ref: 'employees', required: true, index: true },
  candidateId:   { type: mongoose.Schema.Types.ObjectId, ref: 'candidates' },
  joiningDate:   { type: Date, required: true },
  department:    { type: mongoose.Schema.Types.ObjectId, ref: 'departments' },
  designation:   { type: mongoose.Schema.Types.ObjectId, ref: 'designations' },
  reportingTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  
  checklist:     { type: [checklistItemSchema], default: [] },
  completionPercent: { type: Number, default: 0 },
  
  status:        { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending', index: true },
  completedAt:   { type: Date },
  
  welcomeMailSent: { type: Boolean, default: false },
  assetAllocated:  { type: Boolean, default: false },
  
  remarks:       { type: String },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  isDeleted:     { type: Boolean, default: false }
}, { timestamps: true });

onboardingSchema.index({ status: 1, joiningDate: -1 });

export default mongoose.model('onboardings', onboardingSchema);
