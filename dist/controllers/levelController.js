"use strict";

const Level = require('../models/level');

// CREATE a new Level
const createLevel = async (req, res) => {
  try {
    const {
      name,
      description
    } = req.body;

    // Validation supplémentaire
    if (!name) {
      return res.status(400).json({
        error: 'Name is required'
      });
    }
    const newLevel = new Level({
      name,
      description: description || ''
    });
    await newLevel.save();
    res.status(201).json({
      success: true,
      message: 'Level created successfully',
      data: newLevel
    });
  } catch (error) {
    if (error.code === 11000) {
      // Erreur de duplication
      return res.status(400).json({
        success: false,
        error: 'Level name must be unique'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error creating level: ' + error.message
    });
  }
};

// READ all Levels
const getAllLevels = async (req, res) => {
  try {
    const levels = await Level.find().sort({
      name: 1
    }); // Tri par nom
    res.status(200).json({
      success: true,
      count: levels.length,
      data: levels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching levels: ' + error.message
    });
  }
};

// READ a single Level by id
const getLevelById = async (req, res) => {
  try {
    const level = await Level.findById(req.params.id);
    if (!level) {
      return res.status(404).json({
        success: false,
        error: 'Level not found'
      });
    }
    res.status(200).json({
      success: true,
      data: level
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching level: ' + error.message
    });
  }
};

// UPDATE a Level
const updateLevel = async (req, res) => {
  try {
    const {
      name,
      description
    } = req.body;
    if (!name) {
      return res.status(400).json({
        error: 'Name is required'
      });
    }
    const updatedLevel = await Level.findByIdAndUpdate(req.params.id, {
      name,
      description
    }, {
      new: true,
      runValidators: true
    });
    if (!updatedLevel) {
      return res.status(404).json({
        success: false,
        error: 'Level not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Level updated successfully',
      data: updatedLevel
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Level name must be unique'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error updating level: ' + error.message
    });
  }
};

// DELETE a Level
const deleteLevel = async (req, res) => {
  try {
    const deletedLevel = await Level.findByIdAndDelete(req.params.id);
    if (!deletedLevel) {
      return res.status(404).json({
        success: false,
        error: 'Level not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Level deleted successfully',
      data: deletedLevel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error deleting level: ' + error.message
    });
  }
};
module.exports = {
  createLevel,
  getAllLevels,
  getLevelById,
  updateLevel,
  deleteLevel
};