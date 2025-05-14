"use strict";

const mongoose = require("mongoose");
const {
  Schema,
  model,
  models
} = mongoose;
const SkillNodeSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: "SkillNode",
    default: null
  },
  lessonId: {
    type: Schema.Types.ObjectId,
    ref: "Lesson",
    required: true,
    index: true
  },
  position: {
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});
module.exports = mongoose.model("SkillNode", SkillNodeSchema);