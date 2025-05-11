// utils/geminiUtils.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_lou);

const getGeminiAnswer = async (question, systemPrompt) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-002" });

  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: systemPrompt }] }
    ],
  });

  const result = await chat.sendMessage(question);
  return (await result.response).text();
};

const generateResumeFromGemini = async (prompt) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

module.exports = {
  getGeminiAnswer,
  generateResumeFromGemini
};
