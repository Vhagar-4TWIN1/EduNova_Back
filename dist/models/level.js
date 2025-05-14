"use strict";

const mongoose = require('mongoose');
const levelSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true,
    unique: true
  },
  description: String
}, {
  timestamps: true
});

// Vérifiez si le modèle existe déjà avant de le créer
const Level = mongoose.models.Level || mongoose.model('Level', levelSchema);
module.exports = Level;