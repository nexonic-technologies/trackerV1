import mongoose from "mongoose";

const emailConfigSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: true,
    required: true
  },
  service: {
    type: String,
    enum: ['gmail', 'outlook', 'yahoo', 'custom'],
    required: true,
    default: 'gmail'
  },
  host: {
    type: String,
    required: true,
    trim: true
  },
  port: {
    type: Number,
    required: true,
    default: 587
  },
  secure: {
    type: Boolean,
    default: false
  },
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  fromName: {
    type: String,
    required: true,
    trim: true
  },
  fromEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  }
}, {
  timestamps: true,
  collection: 'emailconfigs'
});

// Ensure only one email config exists
emailConfigSchema.pre('save', async function(next) {
  if (this.isNew) {
    await this.constructor.deleteMany({});
  }
  next();
});

export default mongoose.model("EmailConfig", emailConfigSchema);