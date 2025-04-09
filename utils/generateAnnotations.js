const path = require("path");
const axios = require("axios");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const { execSync } = require("child_process");

const llamaModelPath = path.resolve(__dirname, "../models/mistral-7b-instruct-v0.1.Q4_K_M.gguf");

const extractTextFromFile = async (fileUrl) => {
  const tempDir = path.join(__dirname, "../temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  const ext = path.extname(fileUrl).toLowerCase();

  const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
  const filePath = path.join(tempDir, `file${ext}`);
  fs.writeFileSync(filePath, Buffer.from(response.data));

  if (ext === ".pdf") {
    const buffer = fs.readFileSync(filePath);
    const { text } = await pdfParse(buffer);
    return text;
  }

  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    const result = await Tesseract.recognize(filePath, "eng");
    return result.data.text;
  }

  if ([".mp3", ".mp4", ".wav", ".m4a", ".webm"].includes(ext)) {
    const wavPath = path.join(tempDir, "input.wav");
    execSync(`ffmpeg -i "${filePath}" -ar 16000 -ac 1 -f wav "${wavPath}"`);
    execSync(`whisper "${wavPath}" --language en --model base --output_dir "${tempDir}" --output_format txt`);
    const txtPath = wavPath.replace(".wav", ".txt");
    return fs.readFileSync(txtPath, "utf-8");
  }

  return null;
};

const formatPrompt = (rawText) => `
You are an AI assistant helping annotate learning materials. 
Read the following content and generate:
- 3 key highlights with a short label and optional color.
- 3 smart annotations or tips.

Return as JSON like:
{
  "highlights": [{ "text": "...", "color": "#fdd835" }],
  "notes": [{ "content": "..." }]
}

CONTENT:
"""
${rawText.slice(0, 3000)}
"""
`;

exports.generateAnnotations = async (lesson) => {
  try {
    const text = await extractTextFromFile(lesson.fileUrl);
    if (!text) throw new Error("Could not extract text from file");

    const llamaModule = await import("node-llama-cpp");
    const llama = llamaModule.default({
      modelPath: llamaModelPath,
      nCtx: 2048,
    });

    const output = await llama.createCompletion({
      prompt: formatPrompt(text),
      temperature: 0.5,
      maxTokens: 512,
    });

    const parsed = JSON.parse(output.choices[0].text.trim());

    return {
      highlights: parsed.highlights || [],
      notes: parsed.notes?.map((note) => ({ ...note, createdAt: new Date() })) || [],
    };
  } catch (err) {
    console.error("AI Annotation Error:", err);
    return { highlights: [], notes: [] };
  }
};
