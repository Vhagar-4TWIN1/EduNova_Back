const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  text: { 
    type: String, 
    required: [true, "Answer text is required"],
    trim: true
  },
  isCorrect: { 
    type: Boolean, 
    required: [true, "Must specify if answer is correct"],
    default: false 
  }
});

const questionSchema = new mongoose.Schema({
  questionText: { 
    type: String, 
    required: [true, "Question text is required"],
    trim: true 
  },
  answers: {
    type: [answerSchema],
    validate: {
      validator: function(answers) {
        // Validate exactly one correct answer
        return answers.filter(a => a.isCorrect).length === 1;
      },
      message: "Question must have exactly one correct answer"
    }
  }
}, { timestamps: true });

const Question = mongoose.model("Question", questionSchema);
module.exports = Question;


