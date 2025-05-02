const express = require("express");
const router = express.Router();
const path = require("path");
const axios = require("axios");
const fs = require("fs");
const { execSync } = require("child_process");

const tempDir = path.join(__dirname, "../temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

const pythonPath = "C:\\Python312\\python.exe"; // Adjust as needed
const whisperModel = "base";

// ✅ Main Whisper + Translation Route
router.get("/:lessonId/:lang", async (req, res) => {
  console.log("✅ SUBTITLE ROUTE HIT:", req.originalUrl);

  const { lessonId, lang } = req.params;
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: "Missing ?url= query parameter." });
  }

  console.log(
    `💡 Subtitle generation requested for lessonId=${lessonId}, lang=${lang}`
  );
  const videoPath = path.join(tempDir, `video-${lessonId}.mp4`);
  const transcriptPath = path.join(tempDir, `transcript-${lessonId}.txt`);

  try {
    // ✅ Use cached transcript if available
    if (fs.existsSync(transcriptPath)) {
      console.log("⚡ Using cached transcript.");
    } else {
      // ✅ Download video from given URL
      const response = await axios.get(videoUrl, {
        responseType: "arraybuffer",
      });
      fs.writeFileSync(videoPath, Buffer.from(response.data));
      console.log("📥 Video downloaded:", videoPath);

      // ✅ Run Whisper on video file
      const whisperCmd = `"${pythonPath}" -m whisper "${videoPath}" --language en --model ${whisperModel} --output_dir "${tempDir}" --output_format txt`;
      console.log("📣 Running Whisper:", whisperCmd);

      execSync(whisperCmd, {
        env: {
          ...process.env,
          PATH: `${process.env.PATH};C:\\ffmpeg\\bin`,
        },
      });

      // ✅ Rename Whisper output to match transcript file
      const baseName = path.basename(videoPath, path.extname(videoPath));
      const generatedPath = path.join(tempDir, `${baseName}.txt`);
      if (!fs.existsSync(generatedPath)) {
        throw new Error("❌ Whisper did not generate transcript file.");
      }

      fs.renameSync(generatedPath, transcriptPath);
      console.log("✅ Transcript saved:", transcriptPath);
    }

    // ✅ Read the transcript
    const transcript = fs.readFileSync(transcriptPath, "utf-8");

    // ✅ If English, just return the transcript
    if (lang === "en") {
      return res.json({ transcript, translated: transcript });
    }

    // ✅ Otherwise, translate the transcript
    const translationRes = await axios.post(
      "https://libretranslate.de/translate",
      {
        q: transcript,
        source: "en",
        target: lang,
        format: "text",
      }
    );

    console.log("🌐 Translation success");
    return res.json({
      transcript,
      translated: translationRes.data.translatedText,
    });
  } catch (err) {
    console.error("❌ Subtitle error:", err.message || err);
    return res.status(500).json({ error: "Subtitle generation failed." });
  }
});

// ✅ Raw transcript access
router.get("/raw/:lessonId", (req, res) => {
  const { lessonId } = req.params;
  const transcriptPath = path.join(tempDir, `transcript-${lessonId}.txt`);

  try {
    if (!fs.existsSync(transcriptPath)) {
      console.warn("⚠️ Transcript not found:", transcriptPath);
      return res.status(404).send("Transcript not found");
    }

    const transcript = fs.readFileSync(transcriptPath, "utf-8");
    res.setHeader("Content-Type", "text/plain");
    return res.send(transcript);
  } catch (err) {
    console.error("❌ Failed to read transcript:", err.message || err);
    return res.status(500).send("Error reading transcript");
  }
});

module.exports = router;
