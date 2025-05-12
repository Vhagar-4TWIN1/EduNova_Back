// controllers/studySessionController.js
const StudySession = require('../models/studySession');
const SupplementaryLesson = require('../models/supplementaryLesson');
const Module = require('../models/module');

// Start a new study session
exports.startSession = async (req, res) => {
  try {
    const { moduleId, lessonId } = req.params;
    const userId = req.user.userId;

    const session = new StudySession({
      userId,
      moduleId,
      lessonId
    });

    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// End a study session and check for recommendations
exports.endSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await StudySession.findById(id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.endTime = new Date();
    session.duration = (session.endTime - session.startTime) / (1000 * 60); // in minutes
    session.completed = true;
    await session.save();

    // Check if user spent more than threshold (1 minute for testing)
    const threshold = 1; // minutes - adjust as needed
    let recommendation = null;

    if (session.duration > threshold) {
      const supplementaryLessons = await SupplementaryLesson.find({ 
        moduleId: session.moduleId 
      });

      if (supplementaryLessons.length > 0) {
        recommendation = {
          needed: true,
          supplementaryLessons
        };
      }
    }

    res.json({ 
      session,
      recommendation 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get supplementary lessons for a module
exports.getSupplementaryLessons = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const lessons = await SupplementaryLesson.find({ moduleId });
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add a supplementary lesson
exports.addSupplementaryLesson = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title, content, resourceUrl, type, duration } = req.body;
    
    const lesson = new SupplementaryLesson({
      moduleId,
      title,
      content,
      resourceUrl,
      type,
      duration,
      createdBy: req.user.userId
    });

    await lesson.save();
    res.status(201).json(lesson);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a supplementary lesson
exports.deleteSupplementaryLesson = async (req, res) => {
  try {
    const { id } = req.params;
    await SupplementaryLesson.findByIdAndDelete(id);
    res.json({ message: 'Supplementary lesson deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

