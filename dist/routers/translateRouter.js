"use strict";

const express = require("express");
const axios = require("axios");
const router = express.Router();
router.post("/translate", async (req, res) => {
  try {
    const {
      q,
      source,
      target
    } = req.body;
    const response = await axios.post("https://translate.mentality.rip/translate", {
      q,
      source,
      target,
      format: "text"
    });
    res.status(200).json({
      translatedText: response.data.translatedText
    });
  } catch (err) {
    console.error("Proxy translation error:", err.message);
    res.status(500).json({
      error: "Translation failed"
    });
  }
});
module.exports = router;