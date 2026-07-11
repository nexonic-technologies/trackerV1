// models/ApiHitLog.js
import { Schema, model } from 'mongoose';

const ApiHitLogSchema = new Schema({
  method: { type: String, index: true },
  path: { type: String, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'employees' },
  role: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  body: { type: Schema.Types.Mixed },
  query: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  expireAfterSeconds: 30 * 24 * 60 * 60 // Auto-delete after 30 days
});

// Compound indexes for common queries
ApiHitLogSchema.index({ user: 1, timestamp: -1 });
ApiHitLogSchema.index({ path: 1, method: 1, timestamp: -1 });
ApiHitLogSchema.index({ timestamp: -1 });
ApiHitLogSchema.index({ ip: 1, timestamp: -1 });

export default model('apihitlogs', ApiHitLogSchema);