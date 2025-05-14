"use strict";

const mongoose = require("mongoose");
const Lesson = require("../models/lesson");

// GET: All sticky notes for a user in a lesson
exports.getStickyNotes = async (req, res) => {
  try {
    const {
      lessonId
    } = req.params;
    const {
      userId
    } = req.query;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({
      error: "Lesson not found"
    });
    const annotation = lesson.annotations.find(a => a.userId && a.userId.toString() === userId);
    if (!annotation) return res.json([]);
    return res.json(annotation.stickyNotes || []);
  } catch (err) {
    console.error("❌ Get Sticky Notes Error:", err);
    res.status(500).json({
      error: err.message
    });
  }
};

// POST: Add a sticky note
exports.addStickyNote = async (req, res) => {
  try {
    const {
      lessonId
    } = req.params;
    const {
      userId,
      content,
      position,
      color
    } = req.body;
    if (!userId || !content) {
      return res.status(400).json({
        error: "Missing userId or content"
      });
    }

    // ✅ Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: "Invalid userId format"
      });
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({
      error: "Lesson not found"
    });
    const newNote = {
      content,
      position: position || {
        x: 0,
        y: 0
      },
      color: color || "#FFEB3B",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // ✅ Find annotation for this user
    let annotation = lesson.annotations.find(a => a.userId && a.userId.toString() === userId);
    if (annotation) {
      annotation.stickyNotes.push(newNote);
    } else {
      lesson.annotations.push({
        userId: new mongoose.Types.ObjectId(userId),
        highlights: [],
        // ✅ ensure other schema fields exist
        notes: [],
        stickyNotes: [newNote]
      });
    }

    // ✅ Remove any invalid annotations before saving
    lesson.annotations = lesson.annotations.filter(a => a.userId);
    await lesson.save();
    res.status(201).json({
      message: "Sticky note added successfully"
    });
  } catch (err) {
    console.error("🔥 Sticky Note Error:", err);
    res.status(500).json({
      error: err.message
    });
  }
};

// PUT: Update a sticky note by index
exports.updateStickyNote = async (req, res) => {
  try {
    const {
      lessonId,
      noteIndex
    } = req.params;
    const {
      userId,
      content,
      position,
      color
    } = req.body;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({
      error: "Lesson not found"
    });
    const annotation = lesson.annotations.find(a => a.userId && a.userId.toString() === userId);
    if (!annotation || !annotation.stickyNotes[noteIndex]) {
      return res.status(404).json({
        error: "Sticky note not found"
      });
    }
    const note = annotation.stickyNotes[noteIndex];
    note.content = content || note.content;
    note.position = position || note.position;
    note.color = color || note.color;
    note.updatedAt = new Date();
    await lesson.save();
    res.json({
      message: "Sticky note updated successfully"
    });
  } catch (err) {
    console.error("❌ Update Sticky Note Error:", err);
    res.status(500).json({
      error: err.message
    });
  }
};

// DELETE: Delete a sticky note by index
exports.deleteStickyNote = async (req, res) => {
  try {
    const {
      lessonId,
      noteIndex
    } = req.params;
    const {
      userId
    } = req.query;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({
      error: "Lesson not found"
    });
    const annotation = lesson.annotations.find(a => a.userId && a.userId.toString() === userId);
    if (!annotation || !annotation.stickyNotes[noteIndex]) {
      return res.status(404).json({
        error: "Sticky note not found"
      });
    }
    annotation.stickyNotes.splice(noteIndex, 1);
    await lesson.save();
    res.json({
      message: "Sticky note deleted successfully"
    });
  } catch (err) {
    console.error("❌ Delete Sticky Note Error:", err);
    res.status(500).json({
      error: err.message
    });
  }
};