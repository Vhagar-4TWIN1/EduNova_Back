/********************************************
 * Imports & Setup
 ********************************************/
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// For audio/video
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;

// For OCR (images)
const Tesseract = require("tesseract.js");
const sharp = require("sharp");

// For PDF
const PDFParser = require("pdf-parse");

// For text
// (No special library needed, just file or axios)
const FormData = require("form-data");

// Your DB model
const Lesson = require("../models/lesson");

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;         // for Whisper & Chat
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; // for Chat (if using OpenRouter)

// Configure ffmpeg paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);


/********************************************
 * Helper Functions to Extract Text and Audio
 ********************************************/

// Helper function to download a file (if it's a URL)
async function downloadFile(url, destPath) {
  try {
    console.log(`[downloadFile] Downloading file from: ${url}`);
    const response = await axios.get(url, { responseType: "stream" });
    const writer = fs.createWriteStream(destPath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log("[downloadFile] Download complete:", destPath);
        resolve();
      });
      writer.on("error", (err) => {
        console.error("[downloadFile] Error downloading file:", err);
        reject(err);
      });
    });
  } catch (error) {
    console.error("[downloadFile] Error downloading file:", error.message);
    throw error;
  }
}

// Extract audio from video (MP4, MOV, etc.)
async function extractAudioFromVideo(fileUrl) {
  console.log("[extractAudioFromVideo] Starting audio extraction...");
  let tempVideoPath = path.resolve("temp/video.mp4");
  const audioOutputPath = path.resolve("temp/audio-output.wav"); // Temporary location for audio extraction

  // Download video if URL is remote
  if (fileUrl.startsWith("http")) {
    console.log("[extractAudioFromVideo] File is remote, downloading...");
    await downloadFile(fileUrl, tempVideoPath);
  } else {
    console.log("[extractAudioFromVideo] File is local.");
    tempVideoPath = path.resolve(fileUrl);
  }

  console.log("[extractAudioFromVideo] Running FFmpeg...");
  return new Promise((resolve, reject) => {
    ffmpeg(tempVideoPath)
      .audioChannels(1) // Mono audio
      .audioFrequency(16000) // 16kHz sample rate
      .toFormat("wav") // Audio format (WAV)
      .on("end", () => {
        console.log("[extractAudioFromVideo] Audio extraction completed.");
        resolve(audioOutputPath);
      })
      .on("error", (err) => {
        console.error("[extractAudioFromVideo] Error extracting audio:", err.message);
        reject(`Error extracting audio: ${err.message}`);
      })
      .save(audioOutputPath);
  });
}

// Extract text from PDF file
async function extractFromPDF(pdfUrl) {
  console.log("[extractFromPDF] Attempting to extract PDF text...");
  try {
    let pdfBuffer;

    if (pdfUrl.startsWith("http")) {
      console.log("[extractFromPDF] PDF is remote. Downloading...");
      const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
      pdfBuffer = response.data;
    } else {
      console.log("[extractFromPDF] PDF is local.");
      pdfBuffer = fs.readFileSync(path.resolve(pdfUrl));
    }

    const data = await PDFParser(pdfBuffer);
    console.log("[extractFromPDF] PDF text extracted successfully.");
    return data.text;
  } catch (error) {
    console.error("[extractFromPDF] Error extracting PDF:", error.message);
    return "";
  }
}

// Extract text from image (OCR using Tesseract.js)
async function extractFromImage(imageUrl) {
  console.log("[extractFromImage] Attempting to extract image text via OCR...");
  try {
    let imageBuffer;

    if (imageUrl.startsWith("http")) {
      console.log("[extractFromImage] Image is remote. Downloading...");
      const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
      imageBuffer = response.data;
    } else {
      console.log("[extractFromImage] Image is local.");
      imageBuffer = fs.readFileSync(path.resolve(imageUrl));
    }

    const ext = path.extname(imageUrl).toLowerCase();
    const tempDir = path.join(__dirname, "..", "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const imagePath = path.join(tempDir, `temp_image${ext}`);
    fs.writeFileSync(imagePath, imageBuffer);

    // Pre-process the image using sharp
    const cleanedImagePath = path.join(tempDir, "cleaned.png");
    console.log("[extractFromImage] Pre-processing image...");
    await sharp(imagePath)
      .grayscale()
      .normalize()
      .resize({ width: 1200 })
      .toFile(cleanedImagePath);

    console.log("[extractFromImage] Running OCR with Tesseract...");
    const result = await Tesseract.recognize(cleanedImagePath, "eng");
    console.log("[extractFromImage] Image text extracted successfully via OCR.");
    return result.data.text;
  } catch (error) {
    console.error("[extractFromImage] Error extracting image text:", error.message);
    return "";
  }
}

// Extract text from a plain text file
async function extractFromTextFile(textUrl) {
  console.log("[extractFromTextFile] Attempting to extract text from file...");
  try {
    if (textUrl.startsWith("http")) {
      console.log("[extractFromTextFile] Text file is remote. Downloading...");
      const response = await axios.get(textUrl);
      return response.data;
    } else {
      console.log("[extractFromTextFile] Text file is local.");
      const localPath = path.resolve(textUrl);
      return fs.readFileSync(localPath, "utf8");
    }
  } catch (error) {
    console.error("[extractFromTextFile] Error extracting text from file:", error.message);
    return "";
  }
}

// Determine which extraction logic to use
async function extractTextFromFile(fileUrl, typeLesson) {
  console.log("[extractTextFromFile] typeLesson:", typeLesson, ", fileUrl:", fileUrl);
  const ext = path.extname(fileUrl).toLowerCase();
  const tempDir = path.join(__dirname, "..", "temp");

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // 1) Handle PDFs
  if (typeLesson === "pdf" || ext === ".pdf") {
    return await extractFromPDF(fileUrl);
  }

  // 2) Handle images/photos
  if (
    ["photo", "image"].includes(typeLesson) ||
    [".png", ".jpg", ".jpeg", ".webp"].includes(ext)
  ) {
    return await extractFromImage(fileUrl);
  }

  // 3) Handle videos/audios
  if (
    typeLesson === "video" ||
    typeLesson === "audio" ||
    [".mp4", ".mov", ".avi", ".mkv", ".webm", ".mp3", ".wav"].includes(ext)
  ) {
    // Extract audio from video or skip if audio-only
    // (You could implement speech-to-text here if desired)
    await extractAudioFromVideo(fileUrl);
    console.log("[extractTextFromFile] Returning empty string. Audio extraction is done.");
    return "";
  }

  // 4) Handle text files
  if (typeLesson === "text" || [".txt", ".md"].includes(ext)) {
    return await extractFromTextFile(fileUrl);
  }

  // Default fallback
  console.warn("[extractTextFromFile] No matching file type/extension. Returning empty string.");
  return "";
}

/********************************************
 * AI Annotation Generation
 ********************************************/

async function generateAnnotationsFromAI(fullText) {
  console.log("🤖 [generateAnnotationsFromAI] Text length:", fullText.length);

  // Check if text is empty before making the request
  if (!fullText || fullText.trim().length === 0) {
    console.error("❌ [generateAnnotationsFromAI] No valid text provided. Using fallback.");
    fullText = "No valid text available"; // Provide a fallback text
  }

  const prompt = `
You are EduNova’s AI annotation assistant. Read the following transcript and propose relevant highlights and notes.
Respond ONLY with a JSON object in the following format:
{
  "highlights": [
    { "text": "string", "color": "#RRGGBB" }
  ],
  "notes": [
    { "content": "string" }
  ]
}

Transcript: ${fullText}
`.trim();

  let rawReply;
  try {
    console.log("🤖 [generateAnnotationsFromAI] Sending request to OpenRouter...");
    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-maverick",
        messages: [
          {
            role: "system",
            content: "You are EduNova’s AI. Return ONLY valid JSON with highlights and notes.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.0,
        max_tokens: 1000,
      }),
    });

    if (!orRes.ok) {
      const orError = await orRes.json();
      throw new Error(
        orError.error?.message || `OpenRouter responded with status ${orRes.status}`
      );
    }

    const orJson = await orRes.json();
    rawReply = orJson.choices[0].message.content.trim();
    console.log("🤖 [generateAnnotationsFromAI] Received raw AI reply.");
  } catch (err) {
    console.error("❌ [generateAnnotationsFromAI] AI request error:", err);
    throw new Error("AI annotation request failed");
  }

  try {
    // Strip out any code fences if present
    const cleaned = rawReply
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "");

    const parsed = JSON.parse(cleaned);

    if (!parsed.highlights || !parsed.notes) {
      throw new Error("JSON must contain 'highlights' and 'notes'.");
    }
    console.log("🤖 [generateAnnotationsFromAI] Successfully parsed annotations from AI.");
    return parsed;
  } catch (err) {
    console.error("❌ [generateAnnotationsFromAI] JSON parse error:", err, "\nReceived rawReply:", rawReply);
    throw new Error("Invalid JSON from AI");
  }
}

/********************************************
 * Main Controller
 ********************************************/

async function generateAIAnnotations(req, res) {
  console.log("[generateAIAnnotations] Start");
  const lessonId = req.params.id;
  const userId = req.body.userId || null; // optional

  try {
    console.log("[generateAIAnnotations] Fetching lesson by ID:", lessonId);
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      console.error("[generateAIAnnotations] Lesson not found");
      return res.status(404).json({ error: "Lesson not found" });
    }

    const { fileUrl, typeLesson } = lesson;
    console.log("[generateAIAnnotations] Lesson found, typeLesson:", typeLesson, ", fileUrl:", fileUrl);

    if (!typeLesson) {
      console.error("[generateAIAnnotations] Lesson has no typeLesson");
      return res.status(400).json({ error: "Lesson has no typeLesson." });
    }

    // Extract text or audio from the file
    console.log("[generateAIAnnotations] Extracting text from file...");
    const extractedText = await extractTextFromFile(fileUrl, typeLesson);
    console.log("[generateAIAnnotations] Extracted text length:", extractedText?.length);

    if (!extractedText || extractedText.trim().length < 10) {
      console.warn("[generateAIAnnotations] Extracted text too short for annotation generation");
      return res.status(400).json({
        error: "Extracted text is too short or empty for annotation generation.",
      });
    }

    // Generate annotations using AI
    console.log("[generateAIAnnotations] Generating annotations from AI...");
    const annotations = await generateAnnotationsFromAI(extractedText);

    // Append new annotation to lesson
    const newAnnotation = {
      userId,
      highlights: annotations.highlights || [],
      notes: annotations.notes || [],
    };

    console.log("[generateAIAnnotations] Saving annotations to lesson...");
    lesson.annotations.push(newAnnotation);
    await lesson.save();

    console.log("[generateAIAnnotations] Annotations saved successfully.");
    return res.status(200).json({
      message: "Annotations added successfully",
      added: newAnnotation,
      allAnnotations: lesson.annotations,
    });
  } catch (err) {
    console.error("❌ [generateAIAnnotations] Error:", err);
    return res.status(500).json({
      error: "Failed to generate annotations",
      details: err.message,
    });
  }
}

module.exports = {
  generateAIAnnotations,
  generateAnnotationsFromAI,
};
