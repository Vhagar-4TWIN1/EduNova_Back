const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  selectedAnswer: { type: mongoose.Schema.Types.ObjectId },
  isCorrect: Boolean
}, { _id: false });

const quizAttemptSchema = new mongoose.Schema({
  studentId: { type: String, required: true }, // ou ObjectId si vous avez un User
  responses: [responseSchema],
  score: Number,
  studentLevel: {  // Nouveau champ pour stocker le niveau déterminé
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);

