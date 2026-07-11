import { Schema, model } from "mongoose";

const ApprovalWorkflowSchema = new Schema({
  modelName: { type: String, enum: ['leaves', 'regularizations', 'assetallocations', 'assetincidents', 'employeetaskqueuerequests'], required: true, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'departments', index: true },
  steps: [{
    stepOrder: { type: Number, required: true },
    approverType: { 
      type: String, 
      enum: ['Reporting Manager', 'Department Manager', 'HR', 'Specific Role', 'Specific User'], 
      required: true 
    },
    specificRoleId: { type: Schema.Types.ObjectId, ref: 'roles' },
    specificUserId: { type: Schema.Types.ObjectId, ref: 'employees' },
    timeoutDays: { type: Number, default: 3 } // Days allowed before auto-escalating
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

ApprovalWorkflowSchema.index({ modelName: 1, departmentId: 1 }, { unique: true });

export default model('approvalworkflows', ApprovalWorkflowSchema);
