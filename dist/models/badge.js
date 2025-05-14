"use strict";

const mongoose = require('mongoose');
const badgeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    required: true
  }
});
module.exports = mongoose.models.Badge || mongoose.model('Badge', badgeSchema);