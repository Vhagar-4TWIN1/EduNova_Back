const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chat = require('../models/chatModel');
const { User } = require('../models/usersModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const userInfo = `
      Name: ${user.firstName} ${user.lastName}
      Email: ${user.email}
      Role: ${user.role}
      Country: ${user.country}
      Skills: ${user.skills?.join(', ') || 'N/A'}
      Experience: ${user.experience || 'No experience listed'}
      Education: ${user.education || 'Not specified'}
    `;

    const prompt = `Create a professional resume using the following details:\n${userInfo}`;
    const resumeText = await generateResumeFromGemini(prompt);

    const doc = new PDFDocument();
    const fileName = `resume_${user._id}.pdf`;
    const filePath = path.join(__dirname, `../resumes/${fileName}`);

    doc.pipe(fs.createWriteStream(filePath));
    doc.font('Times-Roman').fontSize(12).text(resumeText);
    doc.end();

    res.json({ message: 'Resume generated', file: `/resumes/${fileName}` });
  } catch (error) {
    console.error('Resume Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate resume' });
  }
};


// Keep these functions unchanged:
exports.getChatHistory = async (req, res) => { /* ... */ };
async function getRecommendations(question, learningPref) { /* ... */ }


