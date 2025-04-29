const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chat = require('../models/chatModel');
const { User } = require('../models/usersModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { generateEnhancedResume, createResumePDF } = require('../utils/resumeUtils');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_lou);

exports.askAI = async (req, res) => {
  try {
    const { question, userId } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
    // Role-based prompt
    const systemPrompt = user.role === 'Teacher' 
      ? "You are a teaching assistant. Provide detailed explanations." 
      : "You are a patient tutor. Explain concepts simply.";

    // Gemini-specific formatting
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro-002",  // or "gemini-1.5-pro" if you have access
      // apiVersion: "v1" // You might need to specify this
    });
    

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
      ],
    });

    const result = await chat.sendMessage(question);
    const answer = (await result.response).text();

    // Save to DB
    await Chat.create({ userId, question, answer });

    // Recommendations (unchanged)
    let recommendations = [];
    if (user.role === 'Student') {
      recommendations = await getRecommendations(question, user.learningPreference);
    }

    res.json({ answer, recommendations });
  } catch (error) {
    console.error('Gemini Error:', error);
    res.status(500).json({ error: error.message });
  }
};


exports.generateResume = async (req, res) => {
  try {
    const userId = req.body.userId || req.user.userId;
    const user = await User.findById(userId);
    const uploadedFile = req.file;

    // Validation checks
    if (!user) {
      if (uploadedFile) fs.unlinkSync(uploadedFile.path);
      return res.status(404).json({ error: 'User not found' });
    }
    if (!uploadedFile) return res.status(400).json({ error: 'No PDF file uploaded' });
    if (uploadedFile.mimetype !== 'application/pdf') {
      fs.unlinkSync(uploadedFile.path);
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    // Generate enhanced resume
    const resumeText = await generateEnhancedResume(user, uploadedFile.path);
    
    // Create PDF
    const fileUrl = await createResumePDF(resumeText, user._id);

    // Clean up
    try {
      fs.unlinkSync(uploadedFile.path);
    } catch (err) {
      console.error('Error cleaning upload:', err);
    }

    res.json({ 
      success: true,
      file: fileUrl
    });

  } catch (error) {
    // Clean up on error
    if (req.file?.path) fs.unlinkSync(req.file.path);
    
    console.error('Resume Generation Error:', error);
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Failed to generate resume';
      
    res.status(500).json({ error: errorMessage });
  }
};

// Keep these functions unchanged:
exports.getChatHistory = async (req, res) => { /* ... */ };
async function getRecommendations(question, learningPref) { /* ... */ }


