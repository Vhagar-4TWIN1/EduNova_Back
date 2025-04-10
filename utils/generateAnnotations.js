const path = require("path");
const axios = require("axios");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");
const { execSync } = require("child_process");

// Use CommonJS import style for OpenAI
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// Ensure temporary directory exists
const tempDir = path.join(__dirname, "../temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

/**
 * Extract text from a PDF file
 */
async function extractFromPDF(pdfUrl) {
  try {
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    const data = await pdfParse(response.data);
    return data.text;
  } catch (error) {
    console.error("Error extracting PDF:", error.message);
    return "";
  }
}

/**
 * Extract text from an image using Tesseract with preprocessing
 */
async function extractFromImage(imageUrl) {
  try {
    // Download the image
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const ext = path.extname(imageUrl).toLowerCase();
    const imagePath = path.join(tempDir, `image${ext}`);
    fs.writeFileSync(imagePath, response.data);

    // Preprocess image for better OCR: grayscale, normalize, and resize
    const cleanedImagePath = path.join(tempDir, "cleaned.png");
    await sharp(imagePath)
      .grayscale()
      .normalize()
      .resize({ width: 1200 })
      .toFile(cleanedImagePath);

    const result = await Tesseract.recognize(cleanedImagePath, "eng");
    return result.data.text;
  } catch (error) {
    console.error("Error extracting image text:", error.message);
    return "";
  }
}

/**
 * Extract text from audio or video.
 * Converts the media file to WAV using ffmpeg and then calls Whisper CLI for transcription.
 */
async function extractFromAudioOrVideo(fileUrl) {
  try {
    const ext = path.extname(fileUrl).toLowerCase();
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const filePath = path.join(tempDir, `media${ext}`);
    fs.writeFileSync(filePath, response.data);

    // Convert media file to WAV
    const wavPath = path.join(tempDir, "input.wav");
    execSync(`ffmpeg -i "${filePath}" -ar 16000 -ac 1 -f wav "${wavPath}"`);

    // Run Whisper CLI (ensure whisper is installed and in your PATH)
    // Using a higher-quality model ("medium") may help improve transcription accuracy.
    execSync(
      `whisper "${wavPath}" --language en --model medium --output_dir "${tempDir}" --output_format txt`
    );

    // Whisper writes a .txt file with the same basename as the WAV file
    const txtPath = path.join(tempDir, "input.txt");
    const text = fs.readFileSync(txtPath, "utf-8");
    return text;
  } catch (error) {
    console.error("Error extracting audio/video:", error.message);
    return "";
  }
}

/**
 * Extract text from file based on file URL and lesson type.
 */
const extractTextFromFile = async (fileUrl, typeLesson) => {
  const ext = path.extname(fileUrl).toLowerCase();

  if (typeLesson === "pdf" || ext === ".pdf") {
    return await extractFromPDF(fileUrl);
  }
  if (
    [".png", ".jpg", ".jpeg", ".webp"].includes(ext) ||
    typeLesson === "image" ||
    typeLesson === "photo"
  ) {
    return await extractFromImage(fileUrl);
  }
  if (
    [".mp3", ".mp4", ".wav", ".m4a", ".webm"].includes(ext) ||
    typeLesson === "audio" ||
    typeLesson === "video"
  ) {
    return await extractFromAudioOrVideo(fileUrl);
  }
  if (typeLesson === "text") {
    return "No extraction needed for plain text.";
  }
  return "";
};

/**
 * Clean text by reducing whitespace and removing non-ASCII characters
 */
const cleanText = (text) =>
  text.replace(/\s+/g, " ").replace(/[^\x20-\x7E]+/g, "").trim();

/**
 * Format prompt for the ChatGPT model.
 * We force the model to respond with JSON wrapped in triple backticks.
 */
const formatPrompt = (rawText) => `
You are an AI assistant helping annotate learning materials.
Please analyze the content below and generate structured annotations and highlights.
Return your result solely as valid JSON in the following format:
{
  "highlights": [
    { "text": "Key Idea 1", "color": "#fdd835" },
    { "text": "Key Idea 2", "color": "#f44336" },
    { "text": "Key Idea 3", "color": "#2196f3" }
  ],
  "notes": [
    { "content": "Annotation 1" },
    { "content": "Annotation 2" },
    { "content": "Annotation 3" }
  ]
}

Respond ONLY with raw JSON between triple backticks.
Example:
\`\`\`json
{
  "highlights": [
    { "text": "Example Highlight", "color": "#fdd835" },
    { "text": "Another Highlight", "color": "#f44336" },
    { "text": "Last Highlight", "color": "#2196f3" }
  ],
  "notes": [
    { "content": "Annotation note one" },
    { "content": "Annotation note two" },
    { "content": "Annotation note three" }
  ]
}
\`\`\`

CONTENT:
"""
${rawText.slice(0, 3000)}
"""
`;

/**
 * Configure OpenAI API client
 */

/**
 * Generate annotations based on the lesson file content.
 * 1. Extracts text from the file.
 * 2. Cleans the text and creates a prompt.
 * 3. Calls ChatGPT to get structured annotations.
 */
exports.generateAnnotations = async (lesson) => {
  try {
    // 1. Extract text from the lesson file
    const extractedText = await extractTextFromFile(lesson.fileUrl, lesson.typeLesson);
    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error("Extracted text is too short or empty.");
    }

    // 2. Clean the extracted text and prepare the prompt
    const cleaned = cleanText(extractedText);
    const prompt = formatPrompt(cleaned);

    // 3. Call ChatGPT (using gpt-3.5-turbo) to generate annotations
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant for educational content.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    const output = response.data.choices[0].message.content.trim();

    // 4. Extract JSON from the response: look for text between triple backticks
    const jsonMatch = output.match(/```json([\s\S]*?)```/);
    const jsonText = jsonMatch ? jsonMatch[1].trim() : output;
    const parsed = JSON.parse(jsonText);

    // 5. Add timestamps to notes if not already present
    const notesWithTimestamp = (parsed.notes || []).map((note) => ({
      content: note.content,
      createdAt: new Date(),
    }));

    return {
      highlights: parsed.highlights || [],
      notes: notesWithTimestamp,
    };
  } catch (err) {
    console.error("AI Annotation Error:", err);
    return { highlights: [], notes: [] };
  }
};
