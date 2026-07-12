import { Schema, model } from 'mongoose';

const ChannelMemberSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'employees', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' }
}, { _id: false });

const FeedChannelSchema = new Schema({
  name: { type: String, required: true, trim: true, index: true },
  description: { type: String, trim: true },
  groups: [{ type: Schema.Types.ObjectId, ref: 'feedgroups' }],
  members: { type: [ChannelMemberSchema], default: [] },
  isExternal: { type: Boolean, default: false },
  allowedClients: [{ type: Schema.Types.ObjectId, ref: 'clients' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'employees', required: true }
}, { timestamps: true });

export default model('feedchannels', FeedChannelSchema);
