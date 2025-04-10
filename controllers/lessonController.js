const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { execSync } = require("child_process");
const { validationResult } = require("express-validator");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const speech = require("@google-cloud/speech");
const gTTS = require("gtts");
const Tesseract = require("tesseract.js");
const pdfParse = require("pdf-parse");
const Modules = require("../models/module"); 
const Lesson = require("../models/lesson");
const { generateTTS } = require("../utils/textToSpeech");
const { createCourse: createGoogleCourse } = require("../services/googleClassroomService");
const { createCourse: createBlackboardCourse } = require("../services/blackboardService");
const { uploadMediaToCloudinary, deleteMediaFromCloudinary } = require("../utils/cloudinary");
const { generateAnnotations } = require("../utils/generateAnnotations");


const client = new speech.SpeechClient();
ffmpeg.setFfmpegPath(ffmpegPath);

exports.getLessonAudio = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const fileUrl = lesson.fileUrl;

    if (
      !fileUrl ||
      (!fileUrl.includes("drive.google.com") &&
       !fileUrl.includes("cloudinary.com") &&
       !fileUrl.includes("res.cloudinary.com") &&
       !fileUrl.includes("uploadthing.com"))
    ) {
      return res.status(400).json({ message: "Unsupported or invalid file URL for TTS/STT." });
    }

    const fileExt = path.extname(fileUrl).toLowerCase();
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const localPath = path.join(tempDir, `file${fileExt}`);
    fs.writeFileSync(localPath, Buffer.from(response.data));

    if ([".mp3", ".mp4", ".m4a", ".wav", ".webm"].includes(fileExt)) {
      const wavPath = path.join(tempDir, "input.wav");
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(localPath)
          .audioChannels(1)
          .audioFrequency(16000)
          .format("wav")
          .on("end", resolve)
          .on("error", reject)
          .save(wavPath);
      });
      execSync(`whisper \"${wavPath}\" --language en --model base --output_dir \"${tempDir}\" --output_format txt`);
      const outputPath = wavPath.replace(".wav", ".txt");
      const transcript = fs.readFileSync(outputPath, "utf8");
      res.setHeader("Content-Type", "text/plain");
      return res.send(transcript);
    }

    if ([".png", ".jpg", ".jpeg", ".webp"].includes(fileExt)) {
      const { data: { text } } = await Tesseract.recognize(localPath, "eng");
      const mp3Path = path.join(tempDir, `tts.mp3`);
      const gtts = new gTTS(text);
      await new Promise(resolve => gtts.save(mp3Path, resolve));
      const mp3Data = fs.readFileSync(mp3Path);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", `attachment; filename=\"${lesson._id}_tts.mp3\"`);
      return res.send(mp3Data);
    }

    if (fileExt === ".pdf") {
      const dataBuffer = fs.readFileSync(localPath);
      const { text } = await pdfParse(dataBuffer);
      const gtts = new gTTS(text);
      const mp3Path = path.join(tempDir, `tts.mp3`);
      await new Promise(resolve => gtts.save(mp3Path, resolve));
      const mp3Data = fs.readFileSync(mp3Path);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", `attachment; filename=\"${lesson._id}_tts.mp3\"`);
      return res.send(mp3Data);
    }

    return res.status(400).json({ message: "Unsupported file type for TTS/STT." });
  } catch (err) {
    console.error("TTS/STT Error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getGoogleLessons = async (req, res) => {
  try {
    console.log("🔥 Reached getGoogleLessons controller");
    const lessons = await Lesson.find({ LMScontent: 'google-classroom' });
    console.log("📚 Lessons found:", lessons.length);
    res.status(200).json(lessons);
  } catch (error) {
    console.error("❌ getGoogleLessons error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getLessonsByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;

    const module = await Modules.findById(moduleId).populate('lessons');
    res.status(200).json(module.lessons);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.createLesson = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { title, content, typeLesson, fileUrl, public_id,moduleId } = req.body;
    if (!fileUrl) return res.status(400).json({ error: "Missing file URL" });

    const lesson = await Lesson.create({ title, content, typeLesson, fileUrl, public_id,moduleId });

    const aiAnnotations = await generateAnnotations(lesson);
    lesson.annotations.push({ userId: null,source: 'ai', highlights: aiAnnotations.highlights, notes: aiAnnotations.notes });
    await lesson.save();

    await syncWithLMS(lesson);
    res.status(201).json(lesson);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.generateAIAnnotations = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const aiAnnotations = await generateAnnotations(lesson);
    // Add AI annotation to the lesson
    lesson.annotations.push({
      highlights: aiAnnotations.highlights,
      notes: aiAnnotations.notes,
    });

    await lesson.save();

    res.status(200).json({
      message: "AI annotations added successfully",
      annotations: lesson.annotations,
    });
  } catch (error) {
    console.error("❌ Annotation generation error:", error);
    res.status(500).json({
      error: "Failed to generate and save AI annotations",
      details: error.message,
    });
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

    const lesson = await Lesson.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    res.status(200).json(lesson);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndDelete(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    if (lesson.public_id) await deleteMediaFromCloudinary(lesson.public_id);
    res.status(200).json({ message: "Lesson deleted successfully" });
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
    const googleCourse = await createGoogleCourse(lesson.title, lesson.content, GOOGLE_ADMIN_EMAIL);
    const blackboardCourse = await createBlackboardCourse(lesson.title, lesson.content);
    console.log("Synced with Google Classroom:", googleCourse.id);
    console.log("Synced with Blackboard:", blackboardCourse.id);
  } catch (error) {
    console.error("LMS Sync Error:", error.message);
  }
};
