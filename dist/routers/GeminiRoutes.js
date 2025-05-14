"use strict";

const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  askAI,
  getChatHistory,
  generateResume
} = require('../controllers/GeminiController');
const {
  authenticate
} = require('../controllers/authController');
const upload = multer({
  dest: 'uploads/pdfgenerator',
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  // Increased to 10MB
  fileFilter: (req, file, cb) => {
    // More robust PDF validation
    const allowedTypes = ['application/pdf', 'application/octet-stream'];
    const isPDF = allowedTypes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.pdf');
    if (isPDF) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed (received: ' + file.mimetype + ')'), false);
    }
  }
});
router.post('/ask', authenticate, askAI);
router.get('/history/:userId', authenticate, getChatHistory);
router.post('/generate-resume', authenticate, upload.single('file'), generateResume);
module.exports = router;