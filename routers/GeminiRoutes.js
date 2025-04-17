const express = require('express');
const router = express.Router();
const { askAI, getChatHistory,generateResume} = require('../controllers/GeminiController');
const { authenticate } = require('../controllers/authController'); // Import specific function

router.post('/ask', authenticate, askAI);
router.get('/history/:userId', authenticate, getChatHistory);
router.post('/generate-resume', authenticate, generateResume);



module.exports = router;