// src/models/Workflow.js
import { Schema, model } from "mongoose";

const WorkflowSchema = new Schema({
  name: { type: String, required: true },
  modelName: { 
    type: String, 
    enum: ['leaves', 'regularizations', 'wfhrequests', 'compoffrequests', 'assetallocations', 'assetincidents', 'tasks', 'tickets', 'candidates', 'onboardings'], 
    required: true, 
    index: true 
  },
  triggerType: { 
    type: String, 
    enum: ['Approval', 'Escalation', 'Onboarding'], 
    required: true,
    index: true 
  },
  conditions: {
    departmentId: { type: Schema.Types.ObjectId, ref: 'departments', index: true },
    priorityLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical', 'Weekly Priority'] }
  },
  steps: [{
    stepOrder: { type: Number, required: true }, // Equivalent to level or sequence order
    timeoutHours: { type: Number, default: 72 },   // Conversion target: timeoutDays -> timeoutHours
    actorType: { 
      type: String, 
      enum: ['Reporting Manager', 'Department Manager', 'HR', 'Specific Role', 'Specific User', 'Candidate'], 
      required: true 
    },
    specificRoleId: { type: Schema.Types.ObjectId, ref: 'roles' },
    specificUserId: { type: Schema.Types.ObjectId, ref: 'employees' },
    actions: [{ 
      type: String, 
      enum: ['SendNotification', 'ChangeAssignee', 'AddFollower', 'UpdateStatus', 'VerifyDocument'], 
      default: ['SendNotification'] 
    }],
    updateStatusTo: { type: String },
    requiredDocumentType: { type: String } // Dynamic slot e.g., 'Resume', 'Photo', 'Aadhaar'
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Index for routing lookups
WorkflowSchema.index({ modelName: 1, triggerType: 1, 'conditions.departmentId': 1 }, { name: "workflow_routing_idx" });

export default model('workflows', WorkflowSchema);
