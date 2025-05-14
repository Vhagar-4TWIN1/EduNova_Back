"use strict";

const express = require("express");
const router = express.Router();
const stickyNoteController = require("../controllers/stickyNoteController");
router.get("/:lessonId", stickyNoteController.getStickyNotes);
router.post("/:lessonId", stickyNoteController.addStickyNote);
router.put("/:lessonId/:noteIndex", stickyNoteController.updateStickyNote);
router.delete("/:lessonId/:noteIndex", stickyNoteController.deleteStickyNote);
module.exports = router;