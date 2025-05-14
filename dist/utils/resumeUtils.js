"use strict";

const {
  GoogleGenerativeAI
} = require("@google/generative-ai");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const {
  extractFromPDF
} = require('./fileUtils');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_lou);

/**
 * Gener ates enhanced resume content from user data and uploaded PDF
 */
const generateEnhancedResume = async (userData, pdfPath) => {
  try {
    var _userData$skills;
    const pdfText = await extractFromPDF(pdfPath);
    const prompt = `Create a professional resume combining these details:
    User Profile:
    - Name: ${userData.firstName} ${userData.lastName}
    - Email: ${userData.email}
    - Role: ${userData.role}
    - Skills: ${((_userData$skills = userData.skills) === null || _userData$skills === void 0 ? void 0 : _userData$skills.join(', ')) || 'None'}
    - Experience: ${userData.experience || 'Not specified'}
    - Education: ${userData.education || 'Not specified'}
    
    Uploaded Resume Content:
    ${pdfText.substring(0, 10000)}`; // Limit to first 10k chars

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp"
    });
    const result = await model.generateContent(prompt);
    return (await result.response).text();
  } catch (error) {
    console.error('Resume generation error:', error);
    throw new Error('Failed to generate enhanced resume content');
  }
};
const createResumePDF = async (resumeText, outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    doc.fontSize(12).text(resumeText, {
      align: 'left',
      width: 500
    });
    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
};
module.exports = {
  generateEnhancedResume,
  createResumePDF
};