import { Schema, model } from "mongoose";

const EscalationWorkflowSchema = new Schema({
  name: { type: String, required: true },
  modelName: { 
    type: String, 
    enum: ['leaves', 'regularizations', 'wfhrequests', 'compoffrequests', 'assetallocations', 'assetincidents', 'tasks', 'tickets'], 
    required: true, 
    index: true 
  },
  conditions: {
    departmentId: { type: Schema.Types.ObjectId, ref: 'departments', index: true },
    priorityLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical', 'Weekly Priority'] }
  },
  steps: [{
    level: { type: Number, required: true },
    timeoutHours: { type: Number, default: 72 },
    escalateToType: { 
      type: String, 
      enum: ['Reporting Manager', 'Department Manager', 'HR', 'Specific Role', 'Specific User'], 
      required: true 
    },
    specificRoleId: { type: Schema.Types.ObjectId, ref: 'roles' },
    specificUserId: { type: Schema.Types.ObjectId, ref: 'employees' },
    actions: [{ 
      type: String, 
      enum: ['ChangeAssignee', 'AddFollower', 'SendNotification', 'UpdateStatus'], 
      default: ['SendNotification'] 
    }],
    updateStatusTo: { type: String }
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

EscalationWorkflowSchema.index({ modelName: 1, 'conditions.departmentId': 1 }, { unique: true });

export default model('escalationworkflows', EscalationWorkflowSchema);
