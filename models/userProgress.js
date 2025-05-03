// models/userProgress.js
const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const userProgressSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  moduleId: {
    type: Schema.Types.ObjectId,
    ref: "Module",
    required: false
  },
  completedLessons: [
    { type: Schema.Types.ObjectId, ref: "Lesson" }
  ],
  completedTasks: [
    { type: Schema.Types.ObjectId, ref: "CalendarEvent" }
  ],
  completedVideoChats: [
    { type: Schema.Types.ObjectId, ref: "CalendarEvent" }
  ],

  // NEW: per-user unlock state for SkillNodes
  unlockedSkillNodes: [
    {
      skillNodeId: {
        type: Schema.Types.ObjectId,
        ref: "SkillNode",
        required: true
      },
      unlockedAt: {
        type: Date,
        default: null
      }
    }
  ]
}, {
  timestamps: true
});

// Avoid model recompilation error in watch mode
module.exports = models.UserProgress
  || model("UserProgress", userProgressSchema);
