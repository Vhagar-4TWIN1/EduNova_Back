"use strict";

const axios = require('axios');
const API_KEY = 'AIzaSyALkNADKmP2u7niLqJIKZtU9HfB3mgmiSg'; // Store this in .env in real apps

const analyzeToxicity = async text => {
  try {
    const response = await axios.post(`https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${API_KEY}`, {
      comment: {
        text
      },
      languages: ["en"],
      requestedAttributes: {
        TOXICITY: {}
      }
    });
    const score = response.data.attributeScores.TOXICITY.summaryScore.value;
    return score; // e.g., 0.85
  } catch (err) {
    console.error("Toxicity analysis failed:", err.message);
    return null;
  }
};
module.exports = {
  analyzeToxicity
};