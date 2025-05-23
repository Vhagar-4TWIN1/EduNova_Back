"use strict";

const mongoose = require("mongoose");
const moduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  image: String,
  lessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lesson"
  }]
});
module.exports = mongoose.model("Module", moduleSchema);