import mongoose from 'mongoose';

const agentTokenSchema = new mongoose.Schema({
  agentId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  isActive: { type: Boolean, default: true },
  
  // Session management
  currentSessionToken: { type: String },
  sessionExpiresAt: { type: Date },
  
  // Security
  lastLoginAt: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date }
}, {
  timestamps: true
});

// Indexes

agentTokenSchema.index({ currentSessionToken: 1 });
agentTokenSchema.index({ clientId: 1 });

export default mongoose.model('AgentToken', agentTokenSchema);