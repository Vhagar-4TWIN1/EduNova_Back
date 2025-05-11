const express = require('express');
const router = express.Router();
const Question = require('../models/questionModel');
const QuizAttempt = require('../models/quizAttempt');
const mongoose = require('mongoose');
const ActivityLog = require('../models/activityLog');
const { auth } = require("../middlewares/auth");


// GÉNÉRER 3 questions par niveau 
router.get('/generate',auth, async (req, res) => {
  try {
    const levels = ['beginner', 'intermediate', 'advanced'];
    const questions = [];

    for (const level of levels) {
  const writtenQuestions = await Question.aggregate([
    { $match: { questionType: 'written' } },
    {
      $lookup: {
        from: 'levels',
        localField: 'level',
        foreignField: '_id',
        as: 'levelData'
      }
    },
    { $unwind: '$levelData' },
    { $match: { 'levelData.name': level } },
    { $sample: { size: 2 } }
  ]);

  const oralQuestions = await Question.aggregate([
    { $match: { questionType: 'oral' } },
    {
      $lookup: {
        from: 'levels',
        localField: 'level',
        foreignField: '_id',
        as: 'levelData'
      }
    },
    { $unwind: '$levelData' },
    { $match: { 'levelData.name': level } },
    { $sample: { size: 1 } }
  ]);

  questions.push(...writtenQuestions, ...oralQuestions);
}
await ActivityLog.create({
    userId: req.user.userId,
    email: req.user.email,
    ipAddress: req.ip || 'Unknown',
    userAgent: req.headers['user-agent'] || 'Unknown',
    action: 'START_EVALUATION'
  });

    res.json(questions);
  } catch (err) {
    console.error('Erreur génération quiz :', err);
    res.status(500).json({ message: err.message });
  }
});


// SOUMETTRE LE QUIZ
// SOUMETTRE LE QUIZ avec détermination du niveau
// router.post('/submit', async (req, res) => {
//     try {
//       const { studentId, responses } = req.body;
  
//       const detailedResponses = await Promise.all(
//         responses.map(async (r) => {
//           const question = await Question.findById(r.questionId).populate('level');
//           if (!question) throw new Error('Question non trouvée');
  
//           const correctAnswer = question.answers.find((a) => a.isCorrect);
//           const isCorrect = r.answerId === String(correctAnswer._id);
  
//           return {
//             question: question._id,
//             selectedAnswer: r.answerId,
//             isCorrect
//           };
//         })
//       );
  
//       const correctCount = detailedResponses.filter(r => r.isCorrect).length;
//       const totalCount = detailedResponses.length;
//       const score = Math.round((correctCount / totalCount) * 100);
  
//       // Détermination du niveau unique
//       let studentLevel;
//       if (score < 40) {
//         studentLevel = 'beginner';
//       } else if (score >= 40 && score < 70) {
//         studentLevel = 'intermediate';
//       } else {
//         studentLevel = 'advanced';
//       }
  
//       const attempt = await QuizAttempt.create({
//         studentId,
//         responses: detailedResponses,
//         score,
//         studentLevel // Enregistrement du niveau déterminé
//       });
  
//       const fullAttempt = await QuizAttempt.findById(attempt._id)
//         .populate({
//           path: 'responses.question',
//           populate: { path: 'level' }
//         });
  
//       res.json({
//         ...fullAttempt.toObject(),
//         message: `Votre niveau est: ${studentLevel}`
//       });
  
//     } catch (err) {
//       console.error('Erreur lors de la soumission du quiz :', err);
//       res.status(500).json({ message: err.message });
//     }
//   });
// router.post('/submit', auth ,async (req, res) => {
//   try {
//     const { studentId, responses } = req.body;

//     // Convertir les answerId en string pour éviter les problèmes de type
//     const detailedResponses = await Promise.all(
//       responses.map(async (r) => {
//         const question = await Question.findById(r.questionId).populate('level');
//         if (!question) throw new Error('Question non trouvée');

//         const correctAnswer = question.answers.find((a) => a.isCorrect);
//         const isCorrect = String(r.answerId) === String(correctAnswer._id); // Conversion en string

//         return {
//           question: question._id,
//           selectedAnswer: String(r.answerId), // Conversion en string
//           isCorrect
//         };
//       })
//     );

//     const correctCount = detailedResponses.filter(r => r.isCorrect).length;
//     const totalCount = detailedResponses.length;
//     const score = Math.round((correctCount / totalCount) * 100);

//     // Détermination du niveau unique
//     let studentLevel;
//     if (score < 40) {
//       studentLevel = 'beginner';
//     } else if (score >= 40 && score < 70) {
//       studentLevel = 'intermediate';
//     } else {
//       studentLevel = 'advanced';
//     }

//     // Créer la tentative de quiz
//     const attempt = new QuizAttempt({
//       studentId,
//       responses: detailedResponses,
//       score,
//       studentLevel
//     });

//     // Sauvegarder la tentative
//     await attempt.save();

//     // Récupérer la tentative complète avec les données peuplées
//     const fullAttempt = await QuizAttempt.findById(attempt._id)
//       .populate({
//         path: 'responses.question',
//         populate: { path: 'level' }
//       });

//     res.json({
//       ...fullAttempt.toObject(),
//       message: `Votre niveau est: ${studentLevel}`
//     });

//     await ActivityLog.create({
//     userId: req.user.userId,
//     email: req.user.email,
//     ipAddress: req.ip || 'Unknown',
//     userAgent: req.headers['user-agent'] || 'Unknown',
//     action: 'SUBMIT_EVALUATION'
//   });

//   } catch (err) {
//     console.error('Erreur lors de la soumission du quiz :', err);
//     res.status(500).json({ message: err.message });
//   }
// });

router.post('/submit', auth, async (req, res) => {
  try {
    const { studentId, responses } = req.body;

    const detailedResponses = await Promise.all(
      responses.map(async (r) => {
        const question = await Question.findById(r.questionId).populate('level');
        if (!question) throw new Error('Question not found');

        const correctAnswer = question.answers.find((a) => a.isCorrect);
        if (!correctAnswer) throw new Error('No correct answer found for question');

        // Conversion sécurisée de l'ID réponse
        let answerId = null;
        if (mongoose.Types.ObjectId.isValid(r.answerId)) {
          answerId = new mongoose.Types.ObjectId(r.answerId);
        }

        const isCorrect = answerId && answerId.equals(correctAnswer._id);

        return {
          question: question._id,
          selectedAnswer: answerId, // maintenant c’est bien un ObjectId ou null
          isCorrect
        };
      })
    );

    const correctCount = detailedResponses.filter(r => r.isCorrect).length;
    const totalCount = detailedResponses.length;
    const score = Math.round((correctCount / totalCount) * 100);

    let studentLevel;
    if (score < 40) {
      studentLevel = 'beginner';
    } else if (score >= 40 && score < 70) {
      studentLevel = 'intermediate';
    } else {
      studentLevel = 'advanced';
    }

    const attempt = new QuizAttempt({
      studentId,
      responses: detailedResponses,
      score,
      studentLevel
    });

    await attempt.save();

    const fullAttempt = await QuizAttempt.findById(attempt._id)
      .populate({
        path: 'responses.question',
        populate: { path: 'level' }
      });

    await ActivityLog.create({
      userId: req.user.userId,
      email: req.user.email,
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      action: 'SUBMIT_EVALUATION'
    });

    res.json({
      ...fullAttempt.toObject(),
      message: `Your level is: ${studentLevel}`
    });

  } catch (err) {
    console.error('Quiz submission error:', err);
    res.status(500).json({ message: err.message });
  }
});


const { User } = require('../models/usersModel'); // Assurez-vous que c'est bien le bon chemin

// Récupérer tous les étudiants avec leurs performances
router.get('/all-students-performance', async (req, res) => {
    try {
        const students = await User.find({ role: 'Student' }).select('firstName lastName email');
        
        const studentsWithPerformance = await Promise.all(
            students.map(async (student) => {
                // Récupérer la dernière tentative pour avoir le niveau actuel et le score
                const lastAttempt = await QuizAttempt.findOne({ studentId: student._id })
                    .sort({ createdAt: -1 }); // Récupérer la dernière tentative
                
                if (!lastAttempt) {
                    return {
                        _id: student._id,
                        name: `${student.firstName} ${student.lastName}`,
                        email: student.email,
                        averageScore: "0", // Aucun score enregistré
                        totalAttempts: 0,
                        currentLevel: "non évalué"
                    };
                }

                // Retourner les informations de l'étudiant avec son dernier score et niveau
                return {
                    _id: student._id,
                    name: `${student.firstName} ${student.lastName}`,
                    email: student.email,
                    averageScore: lastAttempt.score.toFixed(2), // Utiliser le score de la dernière tentative
                    totalAttempts: 1, // Une tentative présente
                    currentLevel: lastAttempt.studentLevel || "non évalué"
                };
            })
        );
        
        res.json(studentsWithPerformance);
    } catch (err) {
        console.error('Erreur lors de la récupération des performances des étudiants:', err);
        res.status(500).json({ message: err.message });
    }
});


// Statistiques globales
router.get('/global-stats', async (req, res) => {
    try {
        // Nombre total d'étudiants
        const totalStudents = await User.countDocuments({ role: 'Student' });
        
        // Nombre total de tentatives
        const totalAttempts = await QuizAttempt.countDocuments();
        
        // Score moyen global
        const avgScoreResult = await QuizAttempt.aggregate([
            { $group: { _id: null, avgScore: { $avg: "$score" } } }
        ]);
        const globalAvgScore = avgScoreResult[0]?.avgScore || 0;
        
        // Répartition par niveau
        const levelDistribution = await QuizAttempt.aggregate([
            { $unwind: "$responses" },
            { $lookup: {
                from: "questions",
                localField: "responses.question",
                foreignField: "_id",
                as: "questionData"
            }},
            { $unwind: "$questionData" },
            { $lookup: {
                from: "levels",
                localField: "questionData.level",
                foreignField: "_id",
                as: "levelData"
            }},
            { $unwind: "$levelData" },
            { $group: {
                _id: "$levelData.name",
                count: { $sum: 1 }
            }},
            { $project: {
                level: "$_id",
                count: 1,
                _id: 0
            }}
        ]);
        
        res.json({
            totalStudents,
            totalAttempts,
            globalAvgScore: globalAvgScore.toFixed(2),
            levelDistribution
        });
    } catch (err) {
        console.error('Erreur lors de la récupération des stats globales:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

