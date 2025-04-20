const express = require("express");
const axios = require("axios");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const aiLimiter = rateLimit({
  windowMs: 10 * 1000, // ✅ 10 seconds
  max: 2, // ✅ Allow up to 2 requests every 10s
  message: { error: "Too many AI requests. Please wait a moment." },
});

// ✅ Dyslexia feedback generation endpoint
router.post("/dyslexia-feedback", aiLimiter, async (req, res) => {
  const { transcript } = req.body;
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a speech therapist assistant. Based on the user's speech, provide a short assessment of potential dyslexia-related challenges.",
          },
          {
            role: "user",
            content: `User said: "${transcript}". What signs of dyslexia might this indicate?`,
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

    const feedback = response.data.choices[0].message.content;
    res.json({ feedback });
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.warn("Rate limit hit. Please try again later.");
      return res
        .status(429)
        .json({ error: "Rate limit exceeded. Try again soon." });
    }
    if (error.response && error.response.status === 401) {
      console.error("Unauthorized: Check your OpenAI API key.");
      return res
        .status(401)
        .json({ error: "Unauthorized access. Check API key." });
    }
    console.error("AI Dyslexia Feedback Error:", error.message);
    res.status(500).json({ error: "Dyslexia feedback generation failed" });
  }
});

// ✅ Lesson suggestion endpoint
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
    if (error.response && error.response.status === 429) {
      console.warn("Rate limit hit. Please try again later.");
      return res
        .status(429)
        .json({ error: "Rate limit exceeded. Try again soon." });
    }
    if (error.response && error.response.status === 401) {
      console.error("Unauthorized: Check your OpenAI API key.");
      return res
        .status(401)
        .json({ error: "Unauthorized access. Check API key." });
    }
    console.error("AI Suggest Error:", error.message);
    res.status(500).json({ error: "AI suggestion failed" });
  }
});

module.exports = router;
