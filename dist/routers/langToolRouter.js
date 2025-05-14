"use strict";

const express = require("express");
const axios = require("axios");
const router = express.Router();

// Route to proxy LanguageTool API
router.post("/", async (req, res) => {
  try {
    const {
      text
    } = req.body;
    const response = await axios.post("https://api.languagetool.org/v2/check", new URLSearchParams({
      text: text,
      language: "en-US" // You can make this dynamic if you want
    }), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    res.json(response.data); // Send back the result to frontend
  } catch (error) {
    console.error("LanguageTool proxy error:", error);
    res.status(500).json({
      message: "LanguageTool correction failed"
    });
  }
});
module.exports = router;