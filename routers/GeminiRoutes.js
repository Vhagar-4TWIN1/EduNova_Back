const express = require('express');
const router = express.Router();
const multer = require('multer');
const { askAI, getChatHistory, generateResume } = require('../controllers/GeminiController');
const { authenticate } = require('../controllers/authController');


const upload = multer({ 
  dest: 'uploads/pdfgenerator',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

router.post('/ask', authenticate, askAI);
router.get('/history/:userId', authenticate, getChatHistory);
router.post('/generate-resume', authenticate, upload.single('pdf'), generateResume);

module.exports = router;


