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
const StudyTime = require('../models/studySession');
const SupplementaryLesson = require('../models/supplementaryLesson');
const { generateTTS } = require("../utils/textToSpeech");
const {
  createCourse: createGoogleCourse,
} = require("../services/googleClassroomService");
const {
  createCourse: createBlackboardCourse,
} = require("../services/blackboardService");
const {
  uploadMediaToCloudinary,
  deleteMediaFromCloudinary,
} = require("../utils/cloudinary");
const { generateAnnotations } = require("../utils/generateAnnotations");
const FileType = require("file-type");
const client = new speech.SpeechClient();
ffmpeg.setFfmpegPath(ffmpegPath);

exports.getLessonAudio = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const fileUrl = lesson.fileUrl;

    if (!fileUrl) {
      return res.status(400).json({ message: "Missing file URL" });
    }

    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    // Download file as buffer
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    // Detect file type
    const fileTypeResult = await FileType.fromBuffer(buffer);
    if (!fileTypeResult) {
      return res.status(400).json({ message: "Could not detect file type" });
    }

    const fileExt = `.${fileTypeResult.ext}`;
    const mime = fileTypeResult.mime;
    const localPath = path.join(tempDir, `file${fileExt}`);
    fs.writeFileSync(localPath, buffer);

    console.log("🧠 Detected:", mime);

    // AUDIO or VIDEO => Whisper STT
    if (mime.startsWith("audio/") || mime.startsWith("video/")) {
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

      execSync(
        `whisper "${wavPath}" --language en --model base --output_dir "${tempDir}" --output_format txt`
      );

      const transcriptPath = wavPath.replace(".wav", ".txt");
      const transcript = fs.readFileSync(transcriptPath, "utf8");
      res.setHeader("Content-Type", "text/plain");
      return res.send(transcript);
    }

    // IMAGE => OCR then TTS
    if (mime.startsWith("image/")) {
      const {
        data: { text },
      } = await Tesseract.recognize(localPath, "eng");

      const mp3Path = path.join(tempDir, "tts.mp3");
      const gtts = new gTTS(text);
      await new Promise((resolve) => gtts.save(mp3Path, resolve));

      const mp3Data = fs.readFileSync(mp3Path);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${lesson._id}_tts.mp3"`
      );
      return res.send(mp3Data);
    }

    // PDF => Text + TTS
    if (mime === "application/pdf") {
      const dataBuffer = fs.readFileSync(localPath);
      const { text } = await pdfParse(dataBuffer);

      const mp3Path = path.join(tempDir, "tts.mp3");
      const gtts = new gTTS(text);
      await new Promise((resolve) => gtts.save(mp3Path, resolve));

      const mp3Data = fs.readFileSync(mp3Path);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${lesson._id}_tts.mp3"`
      );
      return res.send(mp3Data);
    }

    return res.status(400).json({
      message: `Unsupported MIME type (${mime}) for TTS/STT.`,
    });
  } catch (err) {
    console.error("❌ TTS/STT Error:", err);
    res.status(500).json({ error: err.message });
  }
};



exports.trackLessonView = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.userId;
    
    const lesson = await Lesson.findById(lessonId).populate('module');
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    if (!lesson.module) {
      return res.status(400).json({ message: 'Lesson is not associated with a module' });
    }

    const studySession = new StudyTime({
      userId,
      moduleId: lesson.module._id,
      lessonId,
      startTime: new Date()
    });
    await studySession.save();
    
    res.json({ 
      lesson,
      studySessionId: studySession._id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLessonsByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const module = await Modules.findById(moduleId).populate("lessons");
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }
    return res.status(200).json(module.lessons);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getGoogleLessons = async (req, res) => {
  try {
    console.log("🔥 Reached getGoogleLessons controller");
    const lessons = await Lesson.find({ LMScontent: "google-classroom" });
    console.log("📚 Lessons found:", lessons.length);
    res.status(200).json(lessons);
  } catch (error) {
    console.error("❌ getGoogleLessons error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.createLesson = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  try {
    const { title, content, typeLesson, LMScontent, module, public_id } =
      req.body;
    console.log('Received module ID:', req.body.module);

    // 1. Upload or fetch fileUrl first
    let fileUrl = null;
    if (req.file) {
      const uploadResult = await uploadMediaToCloudinary(req.file.path);
      fileUrl = uploadResult.secure_url;
    } else if (req.body.fileUrl) {
      fileUrl = req.body.fileUrl;
    }

    // 2. Ensure module exists
    const foundModule = await Modules.findById(req.body.module);

    if (!foundModule) {
      return res.status(404).json({ message: "Module not found" });
    }

    // 3. Create lesson
    const lesson = await Lesson.create({
      title,
      content,
      typeLesson,
      fileUrl,
      public_id: public_id || "",
      LMScontent,
      module,
    });
    
    // 4. Push lesson to module
    foundModule.lessons.push(lesson._id);
    await foundModule.save();

    await lesson.save();

    console.log("✅ Lesson created:", lesson._id);
    res.status(201).json(lesson);
  } catch (err) {
    console.error("❌ Error in createLesson:", err);
    res
      .status(500)
      .json({ message: "Failed to create lesson", error: err.message });
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

