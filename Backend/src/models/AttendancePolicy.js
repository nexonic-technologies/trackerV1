// models/AttendancePolicy.js
import { Schema, model } from 'mongoose';

const AttendancePolicySchema = new Schema({
  name: { type: String, trim: true, required: true, unique: true },
  description: { type: String },
  
  // Working Hours Definitions
  fullDayHours: { type: Number, default: 8, min: 0 },
  halfDayHours: { type: Number, default: 4, min: 0 },
  minimumPunchHours: { type: Number, default: 2, min: 0 },
  
  // Punctuality Rules
  graceMinutes: { type: Number, default: 15, min: 0 },
  lateMarkThreshold: { type: Number, default: 15, min: 0 }, // Minutes after start time considered a late mark
  lateMarksForHalfDay: { type: Number, default: 3, min: 0 },
  earlyExitThreshold: { type: Number, default: 15, min: 0 }, // Minutes before end time considered early exit
  
  // Off Rules
  weeklyOffRules: {
    type: Schema.Types.Mixed,
    default: {
      type: "static", // static, alternate
      days: ["Sunday"] // e.g., ["Saturday", "Sunday"]
    }
  },
  holidayRules: {
    type: Schema.Types.Mixed,
    default: {
      payMultiplier: 1.0,
      compOffEligible: false
    }
  },
  lopRules: {
    type: Schema.Types.Mixed,
    default: {
      deductFromBasic: true,
      deductFromAllowances: true
    }
  },
  
  sandwichRuleEnabled: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

export default model('attendancepolicies', AttendancePolicySchema);
