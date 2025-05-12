// models/supplementaryLesson.js
const mongoose = require('mongoose');

const supplementaryLessonSchema = new mongoose.Schema({
  moduleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Module', 
    required: true 
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  resourceUrl: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['video', 'article', 'exercise', 'other'],
    required: true
  },
  duration: { type: Number  }, // in minutes
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('SupplementaryLesson', supplementaryLessonSchema);