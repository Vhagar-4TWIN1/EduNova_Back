const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  content: { type: String},
  voiceUrl: { type: String },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]

});

module.exports = mongoose.model('Reply', replySchema);
