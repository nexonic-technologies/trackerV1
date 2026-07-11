import mongoose from "mongoose";

const AssetInvoiceSchema = new mongoose.Schema({
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "assetpurchases", required: true, index: true },
  invoiceNumber: { type: String, required: true, unique: true, trim: true, index: true },
  invoiceDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  subTotal: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  status: { 
    type: String, 
    enum: ["Pending", "Approved", "Paid", "Void"], 
    default: "Pending", 
    index: true 
  }
}, { timestamps: true });

AssetInvoiceSchema.index({ dueDate: 1 });

export default mongoose.model("assetinvoices", AssetInvoiceSchema);
