const express = require("express");
const router = express.Router();
const multer = require("multer");
const questionController = require("../controllers/questionController");

router.post("/questions", questionController.createQuestion);
router.get("/questions", questionController.getAllQuestions);
router.get("/questions/:id", questionController.getQuestionById);
router.put("/questions/:id", questionController.updateQuestion);
router.delete("/questions/:id", questionController.deleteQuestion);
// Configuration de Multer pour l'upload de fichiers
const upload = multer({ dest: "uploads/" });

// Route pour uploader un fichier CSV
router.post("/upload-csv", upload.single("csvFile"), questionController.importQuestionsFromCSV);

module.exports = router;
