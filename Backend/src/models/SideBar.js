// src/Models/SideBar.js
import mongoose from "mongoose";

const IconSchema = new mongoose.Schema({
  iconName: { type: String },
  iconPackage: { type: String }
}, { _id: false });

const SideBarSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  icon: IconSchema,

  mainRoute: {
    type: String,
    trim: true,
    required: true,
    unique: true,
  },

  // Visibility control — prevents accidental menu exposure.
  // "public"    → always visible (Dashboard, Calendar, Settings)
  // "protected" → requires resourceId + read permission to be visible
  visibility: {
    type: String,
    enum: ["public", "protected"],
    default: "protected",
    index: true
  },

  // References the Resource collection for permission derivation.
  // Required when visibility = "protected".
  // Replaces the old string-based resourceKey (no more string drift).
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "resources",
    default: null,
    index: true
  },
  // Role-based visibility
  allowedDepartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'departments',
    default: []
  }],
  allowedDesignations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'designations',
    default: []
  }],

  // Sidebar capabilities: define which capabilities are required to view this menu item
  // These are compared against user's role capabilities to determine visibility
  capabilities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Capability',
    default: []
  }],

  routes: [{
    type: String,
  }],

  // Parent-child structure
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'sidebars', default: null },
  hasChildren: { type: Boolean, default: false },
  isParent: { type: Boolean, default: false },

  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },

}, { timestamps: true });

// Compound index for active+sorting queries
SideBarSchema.index({ isActive: 1, order: 1 });
SideBarSchema.index({ parentId: 1, order: 1 });
SideBarSchema.index({ isParent: 1, hasChildren: 1 });

export default mongoose.model("sidebars", SideBarSchema);
