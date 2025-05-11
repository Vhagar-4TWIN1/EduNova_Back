const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chat = require('../models/chatModel');
const { User } = require('../models/usersModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { generateEnhancedResume, createResumePDF } = require('../utils/resumeUtils');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_lou);


const RESUMES_DIR = path.join(__dirname, '..', 'uploads', 'resumes');


if (!fs.existsSync(RESUMES_DIR)) {
  fs.mkdirSync(RESUMES_DIR, { recursive: true });
}


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
      model: "gemini-2.0-flash-exp",  // or "gemini-1.5-pro" if you have access
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
  let tempFiles = []; // Track files to clean up
  
  try {
    const userId = req.body.userId || req.user.userId;
    const user = await User.findById(userId);
    const uploadedFile = req.file;

    // Validation checks
    if (!user) {
      throw new Error('User not found');
    }
    if (!uploadedFile) {
      throw new Error('No PDF file uploaded');
    }
    tempFiles.push(uploadedFile.path);

    if (uploadedFile.mimetype !== 'application/pdf') {
      throw new Error('Only PDF files are allowed');
    }

    // Generate enhanced resume
    const resumeText = await generateEnhancedResume(user, uploadedFile.path);
    
    // Create PDF in the proper directory
    const fileName = `resume_${user._id}_${Date.now()}.pdf`;
    const filePath = path.join(RESUMES_DIR, fileName);
    
    await createResumePDF(resumeText, filePath); // Pass full path
    tempFiles.push(filePath);

    // Verify file was created
    if (!fs.existsSync(filePath)) {
      throw new Error('Failed to create resume file');
    }

    // Set headers and send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="enhanced_resume_${user.name || user._id}.pdf"`
    );
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
      // Clean up after sending
      cleanUpFiles(tempFiles);
    });

  } catch (error) {
    console.error('Resume Generation Error:', error);
    cleanUpFiles(tempFiles);
    res.status(500).json({ 
      error: 'Failed to generate resume',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function for cleanup
function cleanUpFiles(files) {
  files.forEach(file => {
    try {
      if (file && fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  });
}
// Keep these functions unchanged:
exports.getChatHistory = async (req, res) => { /* ... */ };
async function getRecommendations(question, learningPref) { /* ... */ }


