import mongoose from "mongoose";

const OAItemSchema = new mongoose.Schema({
  productId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'products' }],
  productName: { type: String, required: true },
  description: { type: String },
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true },
  tax: { type: Number, default: 0 }, // GST %
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, required: true }
}, { _id: false });

const OrderAcknowledgmentSchema = new mongoose.Schema({
  oaNumber: { type: String, required: true, unique: true, index: true },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'quotations', index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'clients', required: true, index: true },
  clientName: { type: String },
  committedPrice: { type: Number, required: true }, // Final agreed value including GST
  subtotal: { type: Number, required: true },
  taxTotal: { type: Number, default: 0 }, // Total GST
  items: [OAItemSchema],
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Approved', 'Cancelled'],
    default: 'Draft',
    index: true
  },
  approvedDate: { type: Date },
  oaLetterUrl: { type: String }, // Path to the generated PDF
  notes: { type: String },
  terms: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' }
}, { timestamps: true });

export default mongoose.model("orderacknowledgments", OrderAcknowledgmentSchema);
