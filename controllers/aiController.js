const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chat = require('../models/chatModel');
const User = require('../models/usersModel');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Handle AI question answering with Gemini
exports.askAI = async (req, res) => {
  try {
    const { question, userId } = req.body;
    
    // Get user's learning preferences (if student)
    const user = await User.findById(userId);
    const isStudent = user.role === 'Student';
    const learningPref = isStudent ? user.learningPreference : null;

    // Customize system prompt based on user role
    const systemPrompt = 
      user.role === 'Teacher' 
        ? "You are a teaching assistant. Provide detailed explanations." 
        : "You are a patient tutor. Explain concepts simply.";

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `${systemPrompt}\n\nUser Question: ${question}`;

    // Get AI response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    // Save to database
    const chat = new Chat({ userId, question, answer });
    await chat.save();

    // If student, recommend resources based on topic
    let recommendations = [];
    if (isStudent) {
      recommendations = await getRecommendations(question, learningPref);
    }

    res.json({ answer, recommendations });
  } catch (error) {
    console.error('Gemini Error:', error);
    res.status(500).json({ error: 'AI service unavailable' });
  }
};

// (Keep getChatHistory and getRecommendations functions the same as before)