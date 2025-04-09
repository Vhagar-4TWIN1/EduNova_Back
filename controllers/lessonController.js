const Lesson = require("../models/lesson");
const Module = require("../models/module");

const { validationResult } = require("express-validator");
const { generateTTS } = require("../utils/textToSpeech");
const {
  createCourse: createGoogleCourse,
} = require("../services/googleClassroomService");
const {
  createCourse: createBlackboardCourse,
} = require("../services/blackboardService");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");

const GOOGLE_ADMIN_EMAIL = "admin@tondomaine.com";
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
  try {
    const {
      title,
      content,
      typeLesson,
      LMScontent,
      module,
      public_id,
    } = req.body;

    console.log("📥 Creating lesson with module:", module);

    if (!title || !content || !typeLesson || !module) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Ensure the module exists before proceeding
    const foundModule = await Module.findById(module);
    if (!foundModule) {
      return res.status(404).json({ message: "Module not found" });
    }

    // 📦 Handle file upload using multer (check req.file)
    let fileUrl = null;
    if (req.file) {
      // Upload to Cloudinary if needed
      const uploadResult = await uploadMediaToCloudinary(req.file.path);
      fileUrl = uploadResult.secure_url;
    } else if (req.body.fileUrl) {
      fileUrl = req.body.fileUrl;
    }

    const newLesson = new Lesson({
      title,
      content,
      typeLesson,
      fileUrl,
      public_id: public_id || "",
      LMScontent,
      module,
    });

    const savedLesson = await newLesson.save();
    foundModule.lessons.push(savedLesson._id);
    await foundModule.save();

    console.log("✅ Lesson created:", savedLesson._id);
    res.status(201).json(savedLesson);
  } catch (err) {
    console.error("❌ Error in createLesson:", err);
    res.status(500).json({ message: "Failed to create lesson", error: err.message });
  }
};


exports.createLessonInModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title, content, typeLesson, fileUrl, public_id } = req.body;

    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    const lesson = new Lesson({
      title,
      content,
      typeLesson,
      fileUrl,
      public_id,
    });

    await lesson.save();

    module.lessons.push(lesson._id);
    await module.save();

    res
      .status(201)
      .json({ message: "Lesson created and linked to module", lesson });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    res.status(200).json(lesson);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.file) updates.fileUrl = req.file.path;

    const lesson = await Lesson.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    res.status(200).json(lesson);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    // Remove from Cloudinary if needed
    if (lesson.public_id) {
      await deleteMediaFromCloudinary(lesson.public_id);
    }

    // Remove reference from the module
    await Module.findByIdAndUpdate(lesson.module, {
      $pull: { lessons: lesson._id },
    });

    // Finally delete the lesson itself
    await Lesson.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Lesson deleted and reference removed from module" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getLessonWithTTS = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

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
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    lesson.annotations.push({ userId, highlights, notes });
    await lesson.save();

    res.status(200).json(lesson);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const syncWithLMS = async (lesson) => {
  try {
    const googleCourse = await createGoogleCourse(
      lesson.title,
      lesson.content,
      GOOGLE_ADMIN_EMAIL
    );
    const blackboardCourse = await createBlackboardCourse(
      lesson.title,
      lesson.content
    );

    console.log("Synced with Google Classroom:", googleCourse.id);
    console.log("Synced with Blackboard:", blackboardCourse.id);
  } catch (error) {
    console.error("LMS Sync Error:", error.message);
  }
};

exports.getLessonsByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;

    const module = await Module.findById(moduleId).populate("lessons");
    if (!module) return res.status(404).json({ message: "Module not found" });

    res.status(200).json(module.lessons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
