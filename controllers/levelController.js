const Level = require('../models/Level');

// CREATE a new Level
const createLevel = async (req, res) => {
  try {
    const { name, description } = req.body;

    const newLevel = new Level({
      name,
      description
    });

    await newLevel.save();
    res.status(201).json({ message: 'Level created successfully', newLevel });
  } catch (error) {
    res.status(500).json({ error: 'Error creating level' });
  }
};

// READ all Levels
const getAllLevels = async (req, res) => {
  try {
    const levels = await Level.find();
    res.status(200).json(levels);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching levels' });
  }
};

// READ a single Level by id
const getLevelById = async (req, res) => {
  try {
    const level = await Level.findById(req.params.idLevel);
    if (!level) {
      return res.status(404).json({ error: 'Level not found' });
    }
    res.status(200).json(level);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching level' });
  }
};

// UPDATE a Level
const updateLevel = async (req, res) => {
  try {
    const { name, description } = req.body;
    const updatedLevel = await Level.findByIdAndUpdate(
      req.params.idLevel,
      { name, description },
      { new: true }
    );

    if (!updatedLevel) {
      return res.status(404).json({ error: 'Level not found' });
    }
    res.status(200).json({ message: 'Level updated successfully', updatedLevel });
  } catch (error) {
    res.status(500).json({ error: 'Error updating level' });
  }
};

// DELETE a Level
const deleteLevel = async (req, res) => {
  try {
    const deletedLevel = await Level.findByIdAndDelete(req.params.idLevel);
    if (!deletedLevel) {
      return res.status(404).json({ error: 'Level not found' });
    }
    res.status(200).json({ message: 'Level deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting level' });
  }
};

module.exports = {
  createLevel,
  getAllLevels,
  getLevelById,
  updateLevel,
  deleteLevel
};
