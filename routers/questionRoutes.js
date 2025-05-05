const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');



// Configuration de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers audio sont autorisés!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Routes CRUD
router.post('/', 
  upload.fields([
    { name: 'questionAudio', maxCount: 1 },
    { name: 'answerAudios', maxCount: 4 }
  ]),
  questionController.createQuestion
);

router.get('/', questionController.getQuestions);
router.get('/:id', questionController.getQuestion);

router.put('/:id', 
  upload.fields([
    { name: 'questionAudio', maxCount: 1 },
    { name: 'answerAudios', maxCount: 4 }
  ]),
  questionController.updateQuestion
);

router.delete('/:id', questionController.deleteQuestion);

// Configure multer for file uploads
const upload1 = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/json' || 
        file.originalname.match(/\.(csv|json)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV or JSON files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});
//import csv
router.post('/import', upload1.single('file'), questionController.importQuestionsFromCSV);

// Route pour quiz mélangé
router.get('/quiz/mixed', questionController.generateMixedQuiz);

// Routes pour quiz typés
router.get('/quiz/oral', questionController.generateTypedQuiz);
router.get('/quiz/written', questionController.generateTypedQuiz);
module.exports = router;
