const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }],
  tags: [{ type: String }] 
});

module.exports = mongoose.model('Post', postSchema);
