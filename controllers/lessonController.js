const Lesson = require('../models/lesson');
const { validationResult } = require('express-validator');
const { generateTTS } = require('../utils/textToSpeech');
const { createCourse: createGoogleCourse } = require('../services/googleClassroomService');
const { createCourse: createBlackboardCourse } = require('../services/blackboardService');
const { uploadMediaToCloudinary } = require('../utils/cloudinary');
const { deleteMediaFromCloudinary } = require('../utils/cloudinary');


const GOOGLE_ADMIN_EMAIL = 'admin@tondomaine.com';
const gTTS = require("gtts");
const path = require("path");

exports.getLessonAudio = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const gtts = new gTTS(lesson.fileUrl, "en");
    const filePath = path.join(__dirname, `../uploads/tts-${lesson._id}.mp3`);
    const filename = `${lesson.title.replace(/\s+/g, "_")}_tts.mp3`;

    gtts.save(filePath, (err) => {
      if (err) return res.status(500).json({ error: "TTS generation failed" });
      res.download(filePath, filename);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createLesson = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    // Expecting fileUrl and public_id directly from frontend
    const { title, content, typeLesson, fileUrl, public_id } = req.body;

    if (!fileUrl) return res.status(400).json({ error: "Missing file URL" });

    const lesson = await Lesson.create({
      title,
      content,
      typeLesson,
      fileUrl,
      public_id,
    });

    await syncWithLMS(lesson);

    res.status(201).json(lesson);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


exports.getAllLessons = async (_, res) => {
  try {
    const lessons = await Lesson.find();
    res.status(200).json(lessons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    res.status(200).json(lesson);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.file) updates.fileUrl = req.file.path;

    const lesson = await Lesson.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    res.status(200).json(lesson);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndDelete(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    if (lesson.public_id) {
      await deleteMediaFromCloudinary(lesson.public_id);
    }

    res.status(200).json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLessonWithTTS = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const ttsUrl = generateTTS(lesson.content);

    res.status(200).json({ lesson, ttsUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.addAnnotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, highlights, notes } = req.body;

    const lesson = await Lesson.findById(id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    lesson.annotations.push({ userId, highlights, notes });
    await lesson.save();

    res.status(200).json(lesson);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const syncWithLMS = async (lesson) => {
  try {
    const googleCourse = await createGoogleCourse(lesson.title, lesson.content, GOOGLE_ADMIN_EMAIL);
    const blackboardCourse = await createBlackboardCourse(lesson.title, lesson.content);

    console.log('Synced with Google Classroom:', googleCourse.id);
    console.log('Synced with Blackboard:', blackboardCourse.id);
  } catch (error) {
    console.error('LMS Sync Error:', error.message);
  }
};



