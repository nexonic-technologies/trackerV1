// models/AssetRepair.js
import { Schema, model } from 'mongoose';

/**
 * AssetRepair — Tracks physical repairs of assets sent to external vendors.
 */
const AssetRepairSchema = new Schema({
  assetId: {
    type: Schema.Types.ObjectId,
    ref: 'assets',
    required: true,
    index: true
  },
  
  incidentId: {
    type: Schema.Types.ObjectId,
    ref: 'assetincidents',
    index: true,
    default: null
  },
  
  vendorName: {
    type: String,
    trim: true,
    maxLength: 200
  },
  
  vendorContact: {
    type: String,
    trim: true,
    maxLength: 100
  },
  
  repairDescription: {
    type: String,
    trim: true,
    maxLength: 1000
  },
  
  sentDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  expectedReturnDate: {
    type: Date
  },
  
  actualReturnDate: {
    type: Date
  },
  
  repairCost: {
    type: Number,
    min: 0,
    default: 0
  },
  
  repairCondition: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'],
    default: 'Good'
  },
  
  status: {
    type: String,
    enum: ['Sent for Repair', 'In Repair', 'Repaired', 'Beyond Repair'],
    default: 'Sent for Repair',
    index: true
  },
  
  metaStatus: {
    type: String,
    default: 'active',
    index: true
  },
  
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'employees',
    required: true
  }
}, { timestamps: true });

AssetRepairSchema.index({ assetId: 1, status: 1 });
AssetRepairSchema.index({ sentDate: -1 });

export default model('assetrepairs', AssetRepairSchema);
