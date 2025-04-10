// models/Performance.js
const mongoose = require('mongoose');

// Définition du schéma pour la performance
const performanceSchema = new mongoose.Schema(
  {
    // Référence à l'utilisateur (étudiant), 'ref' fait référence à la collection 'User'
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', // Assure-toi que la collection User existe
      required: true 
    },

    // Référence à la leçon, 'ref' fait référence à la collection 'Lesson'
    lessonId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Lesson', // Assure-toi que la collection Lesson existe
      required: true 
    },

    // Titre de la leçon (chaîne de caractères)
    lessonTitle: String,

    // Timestamp de la performance (par défaut, la date et l'heure actuelles)
    timestamp: { 
      type: Date, 
      default: Date.now 
    },

    // Catégorie de l'action (par exemple, 'lesson')
    category: String,

    // Action effectuée (par exemple, 'click', 'view', etc.)
    action: String,
  },
  { timestamps: true } // Ajoute automatiquement les champs createdAt et updatedAt
);

// Exportation du modèle 'Performance'
module.exports = mongoose.model('Performance', performanceSchema);
