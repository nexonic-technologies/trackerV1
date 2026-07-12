import { Schema, model } from 'mongoose';

const ReactionSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'employees', required: true },
  reactionType: { type: String, required: true }
}, { _id: false });

const FeedCommentSchema = new Schema({
  postId: { type: Schema.Types.ObjectId, ref: 'feedposts', required: true, index: true },
  author: { type: Schema.Types.ObjectId, refPath: 'authorModel', required: true },
  authorModel: { type: String, enum: ['employees', 'agents'], default: 'employees' },
  content: { type: String, required: true }, // Rich text enabled from frontend
  attachments: [{ type: String }],
  mentions: [{ type: Schema.Types.ObjectId, ref: 'employees' }],
  reactions: [ReactionSchema],
  replies: [{
    author: { type: Schema.Types.ObjectId, ref: 'employees', required: true },
    content: { type: String, required: true },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'employees' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default model('feedcomments', FeedCommentSchema);
