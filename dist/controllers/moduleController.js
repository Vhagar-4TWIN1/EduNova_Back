"use strict";

// controllers/moduleController.js
const Module = require("../models/module");
const Lesson = require("../models/lesson");
const ActivityLog = require('../models/activityLog');
const {
  evaluateAndAssignBadges
} = require("../controllers/userController");
exports.createModule = async (req, res) => {
  try {
    console.log("Connected user:", req.user); // Should show the logged-in user's ID

    const newModule = new Module({
      ...req.body,
      userId: req.user.userId
    });
    await newModule.save();
    res.status(201).json(newModule);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
exports.getModules = async (req, res) => {
  try {
    const modules = await Module.find().populate("lessons");
    await ActivityLog.create({
      userId: req.user.userId,
      email: req.user.email,
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      action: 'CHECK_MODULE'
    });
    await evaluateAndAssignBadges(req.user.userId);
    res.json(modules);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
exports.updateModule = async (req, res) => {
  try {
    const updatedModule = await Module.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.json(updatedModule);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
exports.deleteModule = async (req, res) => {
  try {
    await Module.findByIdAndDelete(req.params.id);
    res.json({
      message: "Module deleted"
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
exports.getModuleWithId = async (req, res) => {
  try {
    const module = await Module.findById(req.params.id).populate("lessons");
    if (!module) {
      return res.status(404).json({
        message: "Module not found"
      });
    }
    await ActivityLog.create({
      userId: req.user.userId,
      email: req.user.email,
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      action: 'CHECK_LESSON'
    });
    await evaluateAndAssignBadges(req.user.userId);
    res.json(module);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
exports.getModuleWithId = async (req, res) => {
  try {
    const module = await Module.findById(req.params.id);
    if (!module) {
      return res.status(404).json({
        message: 'Module not found'
      });
    }
    await ActivityLog.create({
      userId: req.user.userId,
      email: req.user.email,
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      action: 'CHECK_LESSON'
    });
    await evaluateAndAssignBadges(req.user.userId);
    res.json(module);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
exports.getModuleWithUserId = async (req, res) => {
  try {
    const modules = await Module.find({
      userId: req.user.userId
    }).populate('lessons');
    if (!modules || modules.length === 0) {
      return res.status(404).json({
        message: "No modules found for this user"
      });
    }
    await ActivityLog.create({
      userId: req.user.userId,
      email: req.user.email,
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      action: 'CHECK_LESSON'
    });
    await evaluateAndAssignBadges(req.user.userId);
    res.json(modules);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
exports.trackLessonDuration = async (req, res) => {
  try {
    const {
      moduleId,
      duration
    } = req.body;
    if (!moduleId || !duration) {
      return res.status(400).json({
        message: "Missing moduleId or duration"
      });
    }
    await ActivityLog.create({
      userId: req.user.userId,
      email: req.user.email,
      ipAddress: req.ip || "Unknown",
      userAgent: req.headers["user-agent"] || "Unknown",
      action: "CHECK_LESSON_DURATION",
      duration: duration,
      metadata: {
        moduleId
      }
    });
    await evaluateAndAssignBadges(req.user.userId);
    res.status(200).json({
      message: "Duration logged successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};