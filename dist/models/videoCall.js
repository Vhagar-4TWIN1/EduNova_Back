"use strict";

const mongoose = require('mongoose');
const videoCallSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  recordingUrl: {
    type: String
  }
}, {
  timestamps: true
});
const VideoCall = mongoose.models.VideoCall || mongoose.model('VideoCall', videoCallSchema);
module.exports = VideoCall;