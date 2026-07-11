// models/ErrorLog.js
import { Schema, model } from 'mongoose';

const ErrorLogSchema = new Schema({
  message: { type: String },
  stack: { type: String },
  route: { type: String }, // API route or function name
  user: { type: Schema.Types.ObjectId, ref: 'employees' }, // who triggered
  level: { type: String, enum: ['Info', 'Warning', 'Error', 'Critical'], default: 'Error' }
}, { timestamps: true });

export default model('errorlogs', ErrorLogSchema);