// This file remains exactly the same
const express = require('express');
const router = express.Router();
const { askAI, getChatHistory } = require('../controllers/aiController');
const authenticate = require('../middlewares/auth');

router.post('/ask', authenticate, askAI);
router.get('/history/:userId', authenticate, getChatHistory);

module.exports = router;