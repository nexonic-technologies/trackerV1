// models/PermissionAudit.js
// Audit trail for UI permission changes
// This does NOT replace AccessPolicies - it only tracks UI capability changes

import mongoose from "mongoose";

const PermissionAuditSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employees',
    required: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employees'
  },
  change: {
    type: String,
    required: true,
    trim: true
  },
  reason: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { 
  timestamps: true,
  collection: 'permissionaudits'
});

// Indexes for audit log queries
PermissionAuditSchema.index({ actor: 1, timestamp: -1 });
PermissionAuditSchema.index({ targetUser: 1, timestamp: -1 });
PermissionAuditSchema.index({ timestamp: -1 });

export default mongoose.model("PermissionAudit", PermissionAuditSchema);
