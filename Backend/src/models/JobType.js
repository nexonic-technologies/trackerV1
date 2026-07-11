// models/JobType.js
import mongoose from 'mongoose';

/**
 * JobType — Specific activity an employee can start when working on a task.
 * Admin configures once. Employees select daily via the "What are you doing?" bottom sheet.
 * 
 * Examples: Debugging, Feature Development, Code Review, Client Meeting, Unit Testing
 * 
 * Part of the Activity-Centric Work Model:
 *   JobCategory (master) → JobType (master) → TimeTrackerSession (records)
 * 
 * Key behaviors:
 *   - defaultDeliveryStage: auto-sets task.deliveryStage (only for sequential stages)
 *   - autoSetTaskStatus: auto-sets task.status (e.g., "In Progress" when starting Debugging)
 *   - defaultHourlyRate: fallback if no employee salary structure exists
 *   - isBillable: classifies time for billable vs non-billable analysis
 */
const JobTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: { type: String, trim: true },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'jobcategories',
    required: true,
    index: true
  },

  icon: { type: String, default: '📋' },
  color: { type: String, default: '#6B7280' },

  // ── Cost ──
  defaultHourlyRate: { type: Number, min: 0, default: 0 },
  isBillable: { type: Boolean, default: true },

  // ── Productivity ──
  expectedProductivity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Very High'],
    default: 'Medium'
  },
  expectedOutputUnit: { type: String, trim: true },  // "bugs fixed", "story points", "test cases"

  // ── Auto-Derivation ──
  // Only applied if stage is marked isSequential in StatusConfig.
  // Independent stages (Meeting, Training) do NOT touch task.deliveryStage.
  defaultDeliveryStage: { type: String, default: null },
  autoSetTaskStatus: { type: String, default: null },

  // ── Skill & Access ──
  requiredSkillLevel: {
    type: String,
    enum: ['L1', 'L2', 'L3', 'L4', null],
    default: null
  },
  allowedDesignations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'designations'
  }],

  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  metaStatus: { type: String, default: 'active', index: true }
}, { timestamps: true });

// Indexes
JobTypeSchema.index({ categoryId: 1, isActive: 1, order: 1 });
JobTypeSchema.index({ isActive: 1, order: 1 });
JobTypeSchema.index({ defaultDeliveryStage: 1 });

export default mongoose.model('jobtypes', JobTypeSchema);
