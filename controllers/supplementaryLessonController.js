const SupplementaryLesson = require('../models/supplementaryLesson');
const Module = require('../models/module');

exports.createSupplementaryLesson = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const supplementaryLesson = new SupplementaryLesson({
      ...req.body,
      moduleId
    });
    await supplementaryLesson.save();

    res.status(201).json(supplementaryLesson);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSupplementaryLessonsByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const supplementaryLessons = await SupplementaryLesson.find({ moduleId });
    res.json(supplementaryLessons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteSupplementaryLesson = async (req, res) => {
  try {
    await SupplementaryLesson.findByIdAndDelete(req.params.id);
    res.json({ message: 'Supplementary lesson deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


