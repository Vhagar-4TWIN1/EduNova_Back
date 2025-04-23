const Question = require('../models/questionModel');
const Level = require('../models/level'); 
const fs = require('fs');
const path = require('path');
const csv = require("csv-parser");


// Helper pour supprimer les fichiers
const deleteFile = (filePath) => {
  if (filePath) {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }
};

// Créer une question
exports.createQuestion = async (req, res) => {
  try {
    const { questionText, questionType, level, answers } = req.body;
    const files = req.files || {};

    // Vérifier que le level existe
    const levelExists = await Level.findById(level);
    if (!levelExists) {
      return res.status(400).json({ 
        success: false,
        message: 'Niveau invalide' 
      });
    }

    // Validation
    if (questionType === 'written' && !questionText) {
      return res.status(400).json({ 
        success: false,
        message: 'Le texte est requis pour les questions écrites' 
      });
    }

    if (questionType === 'oral' && !files.questionAudio) {
      return res.status(400).json({ 
        success: false,
        message: 'Un enregistrement audio est requis pour les questions orales' 
      });
    }

    const parsedAnswers = JSON.parse(answers);
    const correctAnswers = parsedAnswers.filter(a => a.isCorrect).length;
    if (correctAnswers !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Il doit y avoir exactement une réponse correcte'
      });
    }

    const question = await Question.create({
      questionText: questionType === 'written' ? questionText : null,
      questionType,
      audioUrl: questionType === 'oral' ? files.questionAudio[0].path : null,
      level,
      answers: parsedAnswers.map((answer, i) => ({
        text: questionType === 'written' ? answer.text : null,
        audioUrl: questionType === 'oral' && files.answerAudios && files.answerAudios[i] 
                 ? files.answerAudios[i].path 
                 : null,
        isCorrect: answer.isCorrect
      }))
    });

    res.status(201).json({
      success: true,
      data: await Question.findById(question._id).populate('level', 'name')
    });

  } catch (error) {
    // Supprimer les fichiers uploadés en cas d'erreur
    if (req.files) {
      if (req.files.questionAudio) deleteFile(req.files.questionAudio[0].path);
      if (req.files.answerAudios) {
        req.files.answerAudios.forEach(file => deleteFile(file.path));
      }
    }

    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Récupérer toutes les questions
exports.getQuestions = async (req, res) => {
  try {
    const questions = await Question.find().populate('level', 'name');
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const questionsWithFullUrls = questions.map(question => {
      // Convertir en objet simple si nécessaire
      const questionObj = question.toObject ? question.toObject() : question;
      
      return {
        ...questionObj,
        audioUrl: questionObj.audioUrl ? `${baseUrl}/${questionObj.audioUrl}` : null,
        answers: questionObj.answers.map(answer => ({
          ...answer,
          audioUrl: answer.audioUrl ? `${baseUrl}/${answer.audioUrl}` : null
        }))
      };
    });

    res.json({
      success: true,
      count: questions.length,
      data: questionsWithFullUrls
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Récupérer une question
exports.getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate('level', 'name');
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question non trouvée'
      });
    }
    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Mettre à jour une question
exports.updateQuestion = async (req, res) => {
  try {
    const { questionText, questionType, level, answers } = req.body;
    const files = req.files || {};
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question non trouvée'
      });
    }

    // Vérifier que le nouveau level existe si fourni
    if (level) {
      const levelExists = await Level.findById(level);
      if (!levelExists) {
        return res.status(400).json({ 
          success: false,
          message: 'Niveau invalide' 
        });
      }
    }

    // Préparer les updates
    const updates = {
      questionText: questionType === 'written' ? questionText : null,
      questionType,
      level: level || question.level,
      answers: JSON.parse(answers)
    };

    // Validation des réponses
    const correctAnswers = updates.answers.filter(a => a.isCorrect).length;
    if (correctAnswers !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Il doit y avoir exactement une réponse correcte'
      });
    }

    // Gestion des fichiers audio
    if (questionType === 'oral') {
      if (files.questionAudio) {
        // Supprimer l'ancien fichier
        if (question.audioUrl) deleteFile(question.audioUrl);
        updates.audioUrl = files.questionAudio[0].path;
      }
      
      // Mettre à jour les réponses audio
      updates.answers = updates.answers.map((answer, i) => {
        const newAnswer = { ...answer };
        const oldAnswer = question.answers.find(a => a._id.toString() === answer._id); 
      
        if (files.answerAudios && files.answerAudios[i]) {
          if (oldAnswer?.audioUrl) {
            deleteFile(oldAnswer.audioUrl);  
          }
          newAnswer.audioUrl = files.answerAudios[i].path;
        }
      
        return newAnswer;
      });
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('level', 'name');

    res.json({
      success: true,
      data: updatedQuestion
    });

  } catch (error) {
    // Supprimer les fichiers uploadés en cas d'erreur
    if (req.files) {
      if (req.files.questionAudio) deleteFile(req.files.questionAudio[0].path);
      if (req.files.answerAudios) {
        req.files.answerAudios.forEach(file => deleteFile(file.path));
      }
    }

    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Supprimer une question
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      console.log('Question non trouvée pour l\'ID :', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Question non trouvée'
      });
    }

    // Supprimer les fichiers audio associés
    if (question.audioUrl) deleteFile(question.audioUrl);
    question.answers.forEach(answer => {
      if (answer.audioUrl) deleteFile(answer.audioUrl);
    });

    await Question.findByIdAndDelete(req.params.id); // ← plus sûr avec Mongoose >= 6

    res.json({
      success: true,
      data: {}
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la question:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Import questions from CSV
// Import questions from CSV
// Helper function to generate random wrong answers
function generateRandomWrongAnswers(count) {
  const fakeAnswers = [
    "42", "Blue whale", "Mount Everest", "Water", "False", 
    "Einstein", "Banana", "Paris", "10", "Gravity"
  ];

  const selected = [];
  while (selected.length < count) {
    const randomText = fakeAnswers[Math.floor(Math.random() * fakeAnswers.length)];
    if (!selected.find(a => a.text === randomText)) {
      selected.push({ text: randomText, isCorrect: false });
    }
  }

  return selected;
}
exports.importQuestionsFromCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const filePath = req.file.path;
  const results = [];
  const errors = [];

  try {
    // Récupérer le niveau "Beginner" par défaut
    const defaultLevel = await Level.findOne({ name: 'beginner' });
    if (!defaultLevel) {
      return res.status(400).json({
        message: 'Import failed',
        error: "Le niveau 'Beginner' est introuvable"
      });
    }

    const defaultType = 'written';
    

    // CSV parsing
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({
          strict: false,
          skipLines: 0,
          trim: true,
          skipEmptyLines: true
        }))
        .on("data", (data) => {
          try {
            // Handle missing questionText and ensure it's unique
            let questionText = data.questionText && data.questionText.trim() !== '' 
              ? data.questionText.trim() 
              : "Generated Question Text " + Math.floor(Math.random() * 1000);

            const answers = [];
            let correctCount = 0;

            // Process answers (support up to 4 answers)
            for (let i = 1; i <= 4; i++) {
              const answerKey = `answer${i}`;
              const correctKey = `isCorrect${i}`;

              if (data[answerKey] && data[answerKey].trim() !== '') {
                const isCorrect = data[correctKey] 
                  ? data[correctKey].toString().toLowerCase() === "true" 
                  : false;

                if (isCorrect) correctCount++;

                answers.push({
                  text: data[answerKey].trim(),
                  isCorrect
                });
              } else {
                // If the answer is missing, add a random wrong answer
                answers.push({
                  text: generateRandomWrongAnswers(1)[0].text, // Random wrong answer
                  isCorrect: false
                });
              }
            }

            // Ensure exactly one correct answer
            if (correctCount === 0) {
              // Mark the first answer as correct if none are marked
              answers[0].isCorrect = true;
            } else if (correctCount > 1) {
              // If there are multiple correct answers, set all but one to false
              for (let i = 1; i < answers.length; i++) {
                if (answers[i].isCorrect) {
                  answers[i].isCorrect = false;
                  break;
                }
              }
            }

            // Ensure at least 2 answers
            if (answers.length < 2) {
              answers.push(...generateRandomWrongAnswers(2 - answers.length)); // Add random wrong answers if less than 2
            }

            results.push({
              questionText: questionText,
              answers,
              level: defaultLevel._id ,
              questionType:defaultType
            });
          } catch (error) {
            errors.push(error.message);
          }
        })
        .on("end", () => resolve())
        .on("error", (error) => reject(error));
    });

    if (errors.length > 0) {
      throw new Error(`Errors in ${errors.length} rows: ${errors.join('; ')}`);
    }

    if (results.length === 0) {
      throw new Error("No valid questions found in file");
    }

    // Enregistrer les questions dans la base de données
    await Question.insertMany(results);
    fs.unlinkSync(filePath);

    res.status(200).json({ 
      message: `Imported ${results.length} questions successfully`,
      count: results.length,
      warnings: errors.length > 0 ? `${errors.length} rows had errors` : undefined
    });

  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(400).json({ 
      message: "Import failed",
      error: error.message,
      details: errors.length > 0 ? errors : undefined
    });
  }
};