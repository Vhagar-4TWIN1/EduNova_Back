"use strict";

const mongoose = require('mongoose');
const answerSchema = new mongoose.Schema({
  text: {
    type: String,
    default: null
  },
  audioUrl: {
    type: String,
    default: null
  },
  isCorrect: {
    type: Boolean,
    required: true
  }
}, {
  _id: true
});
const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    default: null
  },
  questionType: {
    type: String,
    enum: ['oral', 'written'],
    required: true
  },
  audioUrl: {
    type: String,
    default: null
  },
  level: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level',
    required: true
  },
  answers: [answerSchema]
}, {
  timestamps: true
});

// Validation pour s'assurer qu'il y a exactement une réponse correcte
questionSchema.pre('validate', function (next) {
  const correctCount = this.answers.filter(a => a.isCorrect).length;
  if (correctCount !== 1) {
    throw new Error('Il doit y avoir exactement une réponse correcte');
  }
  next();
});

// Middleware pour supprimer les fichiers audio lors de la suppression
questionSchema.post('remove', async function (doc) {
  const fs = require('fs');
  const path = require('path');
  if (doc.audioUrl) {
    const filePath = path.join(__dirname, '..', doc.audioUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  doc.answers.forEach(answer => {
    if (answer.audioUrl) {
      const filePath = path.join(__dirname, '..', answer.audioUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });
});
module.exports = mongoose.model('Question', questionSchema);