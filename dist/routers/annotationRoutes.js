"use strict";

const express = require("express");
const router = express.Router();
const {
  generateAIAnnotations
} = require("../controllers/annotationController");
router.post("/:id/generate-ai-annotations", generateAIAnnotations);
module.exports = router;