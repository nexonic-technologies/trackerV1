import mongoose from 'mongoose';

const TimeTrackerSessionSchema = new mongoose.Schema({
  taskId:    { type: mongoose.Schema.Types.ObjectId, ref: 'tasks',        required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'projecttypes', index: true },
  // Denormalized from Task.clientId at session start — avoids join for client cost reports
  clientId:  { type: mongoose.Schema.Types.ObjectId, ref: 'clients',      default: null, index: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'employees',    required: true, index: true },
  
  startTime: { type: Date, required: true, default: Date.now, index: true },
  endTime: { type: Date },
  
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active',
    index: true
  },
  
  // Total duration in seconds for this session
  duration: { type: Number, default: 0 },
  
  // For multiple pauses within a single high-level session
  pauses: [{
    pausedAt: { type: Date, required: true },
    resumedAt: { type: Date },
    duration: { type: Number, default: 0 } // duration of the pause
  }],
  
  notes: { type: String, trim: true },

  // ── Activity-Centric Work Model Fields (all nullable for backward compatibility) ──
  
  // What activity the employee is performing
  jobTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'jobtypes', default: null, index: true },
  // Denormalized from jobTypeId for fast aggregation queries
  jobCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'jobcategories', default: null, index: true },

  // Production cost snapshot — frozen at session start so rate changes don't affect in-flight sessions
  costSnapshot: {
    employeeHourlyRate: { type: Number, default: 0 },
    isBillable: { type: Boolean, default: true },
    currency: { type: String, default: 'INR' }
  },

  // Computed on completion: duration(hrs) × costSnapshot.employeeHourlyRate
  productionCost: { type: Number, default: 0 },

  // Snapshot of the task's delivery stage when session began
  deliveryStageAtStart: { type: String, default: null }

}, { timestamps: true });

// Compound indexes
TimeTrackerSessionSchema.index({ taskId: 1, userId: 1, status: 1 });

// Ensure a user only has one active session globally
TimeTrackerSessionSchema.index({ userId: 1, status: 1 }, { 
  unique: true, 
  partialFilterExpression: { status: 'active' } 
});

// Activity-Centric indexes
TimeTrackerSessionSchema.index({ jobTypeId: 1, userId: 1, startTime: -1 });     // Activity breakdown per employee
TimeTrackerSessionSchema.index({ jobCategoryId: 1, startTime: -1 });             // Category aggregation
TimeTrackerSessionSchema.index({ taskId: 1, jobTypeId: 1, status: 1 });          // Task activity breakdown
TimeTrackerSessionSchema.index({ userId: 1, startTime: -1, status: 1 });         // Employee timeline (Gantt source)
TimeTrackerSessionSchema.index({ 'costSnapshot.isBillable': 1, status: 1 });     // Billable vs non-billable analysis

// Client / Project cost indexes
TimeTrackerSessionSchema.index({ clientId: 1, startTime: -1 });                   // Client cost by period
TimeTrackerSessionSchema.index({ clientId: 1, 'costSnapshot.isBillable': 1 });    // Billable hours per client
TimeTrackerSessionSchema.index({ clientId: 1, userId: 1, startTime: -1 });        // Employee contribution per client

export default mongoose.models.TimeTrackerSession || mongoose.model('TimeTrackerSession', TimeTrackerSessionSchema);
