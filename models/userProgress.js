const mongoose = require("mongoose");

const userProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Module", required: true },
  completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }]
});

module.exports = mongoose.model("UserProgress", userProgressSchema);
