import mongoose from 'mongoose';

const ClientLedgerSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'clients', required: true, index: true },
  date: { type: Date, required: true, default: Date.now },

  type: {
    type: String,
    enum: ['Credit', 'Debit'],
    required: true
  },

  amount: { type: Number, required: true, min: 0 },
  runningBalance: { type: Number, required: true },

  referenceModel: {
    type: String,
    enum: ['orderacknowledgements', 'paymentjournals'],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel',
    required: true
  },

  description: { type: String, trim: true },
  narration: { type: String, trim: true },

  entryBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' }
}, { timestamps: true });

ClientLedgerSchema.index({ clientId: 1, date: -1 });
ClientLedgerSchema.index({ referenceModel: 1, referenceId: 1 });

export default mongoose.model('clientledgers', ClientLedgerSchema);
