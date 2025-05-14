"use strict";

const toxicity = require('@tensorflow-models/toxicity');
require('@tensorflow/tfjs-node'); // Use CPU backend for Node.js

let model;
const loadModel = async () => {
  model = await toxicity.load(0.85); // Threshold: 85% confidence
  return model;
};

// Initialize model on server start
loadModel().catch(console.error);
exports.checkToxicity = async (req, res, next) => {
  const {
    title,
    content
  } = req.body;
  const text = `${title} ${content}`.trim();
  if (!model) {
    console.warn('Model not loaded yet');
    return next(); // Skip check if model isn't ready
  }
  try {
    const predictions = await model.classify(text);
    const isToxic = predictions.some(p => p.results[0].match);
    if (isToxic) {
      return res.status(400).json({
        error: 'Content violates community guidelines',
        flaggedLabels: predictions.filter(p => p.results[0].match).map(p => p.label)
      });
    }
    next();
  } catch (err) {
    console.error('Toxicity check failed:', err);
    next(); // Fail open (allow post) if check errors
  }
};