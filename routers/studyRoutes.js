const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const StudySession = require('../models/studySession');
const SupplementaryLesson = require('../models/supplementaryLesson');
const {auth} = require('../middlewares/auth');
// Helper function for validating IDs
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
console.log("Study routes initialized");
// Start a new study session
router.post('/start/:moduleId/:lessonId', async (req, res) => {
      console.log("Start session endpoint hit");
  try {
    // Validate IDs
    if (!isValidId(req.params.moduleId)) {  // Fixed: Added missing parenthesis
      return res.status(400).json({ error: 'Invalid module ID format' });
    }
    if (!isValidId(req.params.lessonId)) {
      return res.status(400).json({ error: 'Invalid lesson ID format' });
    }

    // Validate user exists in request (from auth middleware)
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized - missing user data' });
    }

    const session = new StudySession({
      userId: req.user.userId,
      moduleId: req.params.moduleId,
      lessonId: req.params.lessonId,
      startTime: new Date()
    });

    await session.save();
    
    console.log(`Session started: ${session._id}`);
    res.status(201).json({
      success: true,
      sessionId: session._id,
      startTime: session.startTime
    });

  } catch (err) {
    console.error('Error starting session:', err);
    res.status(500).json({ 
      error: 'Failed to start session',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});


router.post('/supplementary/:moduleId', auth, upload.single('file'), async (req, res) => {
  try {
    if (!isValidId(req.params.moduleId)) {
      return res.status(400).json({ error: 'Invalid module ID' });
    }

    const { title, content, resourceUrl, type, duration, platform, difficulty } = req.body;
    const file = req.file; // Fichier uploadé

    if (!title || !content || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Pour les PDF, vérifiez qu'un fichier a été uploadé
    if (type === 'pdf' && !file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    // Pour les autres types, vérifiez l'URL
    if (type !== 'pdf' && !resourceUrl) {
      return res.status(400).json({ error: 'Resource URL is required' });
    }

    const lessonData = {
      moduleId: req.params.moduleId,
      title,
      content,
      type,
      duration: duration || 0,
      createdBy: req.user.userId,
      platform,
      difficulty
    };

    // Ajoutez soit l'URL soit le chemin du fichier
    if (type === 'pdf') {
      lessonData.filePath = file.path; // Stockez le chemin du fichier
    } else {
      lessonData.resourceUrl = resourceUrl;
    }

    const lesson = new SupplementaryLesson(lessonData);
    await lesson.save();

    res.status(201).json(lesson);
  } catch (err) {
    console.error('Error creating lesson:', err);
    res.status(500).json({ 
      error: 'Failed to create supplementary lesson',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// End a study session
// In your study routes file
router.post('/end/:sessionId', async (req, res) => {
  try {
    if (!isValidId(req.params.sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const session = await StudySession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.endTime) {
      return res.status(400).json({ error: 'Session already ended' });
    }

    session.endTime = new Date();
    session.duration = (session.endTime - session.startTime) / (1000 * 60); // in minutes
    await session.save();

    // Check if session was longer than 1 minute
    const showRecommendation = session.duration > 1;
    
    res.json({ 
      success: true,
      duration: session.duration,
      showRecommendation
    });

  } catch (err) {
    console.error('Error ending session:', err);
    res.status(500).json({ 
      error: 'Failed to end session',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get recommendations
router.get('/recommendations/:moduleId', async (req, res) => {
  try {
    if (!isValidId(req.params.moduleId)) {
      return res.status(400).json({ error: 'Invalid module ID format' });
    }

    const supplementaryLessons = await SupplementaryLesson.find({ 
      moduleId: req.params.moduleId 
    }).select('title content resourceUrl type duration');

    res.json({
      success: true,
      count: supplementaryLessons.length,
      lessons: supplementaryLessons
    });

  } catch (err) {
    console.error('Error getting recommendations:', err);
    res.status(500).json({ 
      error: 'Failed to get recommendations',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;

