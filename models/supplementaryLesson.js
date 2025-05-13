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
  resourceUrl: { type: String }, 
  filePath: { type: String }, 
  type: { 
    type: String, 
    enum: ['video', 'article', 'exercise', 'pdf', 'other'],
    required: true
  },
  duration: { type: Number, default: 0 },
  platform: { type: String }, 
  difficulty: { type: String }, 
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('SupplementaryLesson', supplementaryLessonSchema);


