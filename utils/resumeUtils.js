// utils/resumeUtils.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { extractFromPDF } = require('./fileUtils');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_lou);

/**
 * Generates enhanced resume content from user data and uploaded PDF
 */
const generateEnhancedResume = async (userData, pdfPath) => {
  try {
    const pdfText = await extractFromPDF(pdfPath);
    
    const prompt = `Create a professional resume combining these details:
    User Profile:
    - Name: ${userData.firstName} ${userData.lastName}
    - Email: ${userData.email}
    - Role: ${userData.role}
    - Skills: ${userData.skills?.join(', ') || 'None'}
    - Experience: ${userData.experience || 'Not specified'}
    - Education: ${userData.education || 'Not specified'}
    
    Uploaded Resume Content:
    ${pdfText.substring(0, 10000)}`; // Limit to first 10k chars

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-002" });
    const result = await model.generateContent(prompt);
    return (await result.response).text();
  } catch (error) {
    console.error('Resume generation error:', error);
    throw new Error('Failed to generate enhanced resume content');
  }
};

/**
 * Creates a PDF file from generated resume text
 */
const createResumePDF = async (resumeText, userId) => {
  try {
    const doc = new PDFDocument();
    const fileName = `resume_${userId}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, `../resumes/${fileName}`);

    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      doc.font('Times-Roman').fontSize(12).text(resumeText);
      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return `/resumes/${fileName}`;
  } catch (error) {
    console.error('PDF creation error:', error);
    throw new Error('Failed to create PDF file');
  }
};

module.exports = {
  generateEnhancedResume,
  createResumePDF
};