const UserProgress = require("../models/userProgress");

exports.enrollInModule = async (req, res) => {
  const { userId, moduleId } = req.body;
  try {
    const existing = await UserProgress.findOne({ userId, moduleId });
    if (existing) return res.status(200).json({ message: "Already enrolled", enrolled: true });

    const progress = new UserProgress({ userId, moduleId, completedLessons: [] });
    await progress.save();

    res.status(201).json({ message: "Enrolled successfully", enrolled: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.checkEnrollment = async (req, res) => {
  const { userId, moduleId } = req.params;
  try {
    const progress = await UserProgress.findOne({ userId, moduleId });
    res.json({ enrolled: !!progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCompletedLessons = async (req, res) => {
  const { userId, moduleId } = req.params;
  try {
    const progress = await UserProgress.findOne({ userId, moduleId });
    res.json({ completedLessons: progress ? progress.completedLessons : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markLessonCompleted = async (req, res) => {
  const { userId, moduleId, lessonId } = req.body;
  try {
    let progress = await UserProgress.findOne({ userId, moduleId });
    if (!progress) {
      return res.status(400).json({ message: "User is not enrolled in this module." });
    }
    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
      await progress.save();
    }
    res.json({ message: "Lesson marked as completed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
