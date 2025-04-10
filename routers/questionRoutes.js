const express = require("express");
<<<<<<< HEAD
const router = express.Router();
const multer = require("multer");
const questionController = require("../controllers/questionController");

=======
const multer = require("multer");
const router = express.Router();
const questionController = require("../controllers/questionController");

// Configure multer for file uploads
const upload = multer({
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

// Question CRUD routes
>>>>>>> origin/main
router.post("/questions", questionController.createQuestion);
router.get("/questions", questionController.getAllQuestions);
router.get("/questions/:id", questionController.getQuestionById);
router.put("/questions/:id", questionController.updateQuestion);
router.delete("/questions/:id", questionController.deleteQuestion);
<<<<<<< HEAD
// Configuration de Multer pour l'upload de fichiers
const upload = multer({ dest: "uploads/" });

// Route pour uploader un fichier CSV
router.post("/upload-csv", upload.single("csvFile"), questionController.importQuestionsFromCSV);

module.exports = router;
=======

// Import route
router.post('/import', upload.single('file'), questionController.importQuestionsFromCSV);

module.exports = router;

>>>>>>> origin/main
