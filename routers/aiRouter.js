const express = require("express");
const axios = require("axios");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const aiLimiter = rateLimit({
  windowMs: 10 * 1000, // ✅ 10 seconds
  max: 2, // ✅ Allow up to 2 requests every 10s
  message: { error: "Too many AI requests. Please wait a moment." },
});

router.post("/suggest", aiLimiter, async (req, res) => {
  const { title } = req.body;
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: `Write a lesson summary for: "${title}"`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const suggestion = response.data.choices[0].message.content;
    res.json({ suggestion });
  } catch (error) {
    console.error("AI Suggest Error:", error.message);
    res.status(500).json({ error: "AI suggestion failed" });
  }
});

module.exports = router;
