const Question = require("../models/questionModel");
const csv = require("csv-parser");
const fs = require("fs");
// Ajouter une question
exports.createQuestion = async (req, res) => {
    try {
      console.log("Body reçu :", req.body); // Debugging
      const { questionText, answers } = req.body;
  
      if (!questionText || !Array.isArray(answers) || answers.length < 2) {
        return res.status(400).json({ message: "Une question et au moins 2 réponses sont requises !" });
      }
  
      const hasCorrectAnswer = answers.some(answer => answer.isCorrect === true);
      if (!hasCorrectAnswer) {
        return res.status(400).json({ message: "Au moins une réponse correcte est requise !" });
      }
  
      const newQuestion = new Question({ questionText, answers });
      await newQuestion.save();
  
      res.status(201).json({ message: "Question ajoutée avec succès!", question: newQuestion });
    } catch (error) {
      console.error("Erreur lors de l'ajout de la question :", error);
      res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
  };

// Récupérer toutes les questions
exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Récupérer une question par ID
exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question non trouvée" });
    }
    res.status(200).json(question);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Modifier une question
exports.updateQuestion = async (req, res) => {
  try {
    const { questionText, answers } = req.body;
    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      { questionText, answers },
      { new: true }
    );
    if (!updatedQuestion) {
      return res.status(404).json({ message: "Question non trouvée" });
    }
    res.status(200).json({ message: "Question mise à jour avec succès!", question: updatedQuestion });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Supprimer une question
exports.deleteQuestion = async (req, res) => {
  try {
    const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
    if (!deletedQuestion) {
      return res.status(404).json({ message: "Question non trouvée" });
    }
    res.status(200).json({ message: "Question supprimée avec succès!" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};


exports.importQuestionsFromCSV = async (req, res) => {
  const filePath = req.file.path;
  const results = [];

  // Lire et parser le fichier CSV
  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", () => {
      // Transformer les données du CSV en un format compatible avec la base de données
      const questions = results.map((row) => {
        const answers = [];
        for (let i = 1; i <= 3; i++) { // Supposons un maximum de 3 réponses par question
          if (row[`answer${i}`]) {
            answers.push({
              text: row[`answer${i}`],
              isCorrect: row[`isCorrect${i}`] === "true",
            });
          }
        }
        return {
          questionText: row.questionText,
          answers,
        };
      });

      // Enregistrer les questions dans la base de données
      Question.insertMany(questions)
        .then(() => {
          res.status(200).json({ message: "Questions importées avec succès !" });
        })
        .catch((error) => {
          res.status(500).json({ message: "Erreur lors de l'importation des questions", error });
        })
        .finally(() => {
          // Supprimer le fichier CSV après traitement
          fs.unlinkSync(filePath);
        });
    });
};