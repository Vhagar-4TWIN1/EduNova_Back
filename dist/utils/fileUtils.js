"use strict";

const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * Extracts text from a PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<string>} - Extracted text content
 */
const extractFromPDF = async filePath => {
  try {
    const data = await pdfParse(fs.readFileSync(filePath));
    return data.text;
  } catch (error) {
    console.error("Error extracting PDF:", error.message);
    throw new Error("Failed to extract text from PDF");
  }
};
module.exports = {
  extractFromPDF
};