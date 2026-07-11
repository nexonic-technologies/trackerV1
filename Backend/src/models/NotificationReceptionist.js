// models/NotificationReceptionist.js
import mongoose from "mongoose";

const notificationReceptionistSchema = new mongoose.Schema({
  notificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "notifications",
    required: true,
    index: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "employees",
    required: true,
    index: true
  },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  isClicked: { type: Boolean, default: false },
  clickedAt: { type: Date },
  isDeleted: { type: Boolean, default: false, index: true },
  fcmStatus: { 
    type: String, 
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  fcmErrorReason: { type: String },
  deviceDetails: { type: mongoose.Schema.Types.Mixed },
}, { 
  timestamps: true,
  expireAfterSeconds: 90 * 24 * 60 * 60 // Auto-delete after 90 days to save space
});

// Compound indexes for user inbox queries
notificationReceptionistSchema.index({ receiver: 1, isRead: 1, createdAt: -1 });
notificationReceptionistSchema.index({ receiver: 1, createdAt: -1 });
// Index for FCM retry logic and dashboard error tracking
notificationReceptionistSchema.index({ fcmStatus: 1, createdAt: -1 });

export default mongoose.model("notificationreceptionists", notificationReceptionistSchema);
