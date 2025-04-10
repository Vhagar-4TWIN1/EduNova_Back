const Question = require("../models/questionModel");
const csv = require("csv-parser");
const fs = require("fs");

// Helper function to generate random wrong answers
function generateRandomWrongAnswers(count) {
  const fakeAnswers = [
    "42", "Blue whale", "Mount Everest", "Water", "False", 
    "Einstein", "Banana", "Paris", "10", "Gravity"
  ];

  const selected = [];
  while (selected.length < count) {
    const randomText = fakeAnswers[Math.floor(Math.random() * fakeAnswers.length)];
    if (!selected.find(a => a.text === randomText)) {
      selected.push({ text: randomText, isCorrect: false });
    }
  }

  return selected;
}

// Create question with exactly one correct answer
exports.createQuestion = async (req, res) => {
  try {
    const { questionText, answers } = req.body;

    if (!questionText || !Array.isArray(answers) || answers.length < 2) {
      return res.status(400).json({ message: "Question and at least 2 answers are required!" });
    }

    const correctAnswers = answers.filter(answer => answer.isCorrect).length;
    if (correctAnswers !== 1) {
      return res.status(400).json({ message: "There must be exactly one correct answer!" });
    }

    let finalAnswers = [...answers];

    // If less than 2 answers, fill with fake answers
    if (finalAnswers.length < 2) {
      const needed = 2 - finalAnswers.length;
      const fakeAnswers = generateRandomWrongAnswers(needed);
      finalAnswers.push(...fakeAnswers);
    }

    const newQuestion = new Question({ questionText, answers: finalAnswers });
    await newQuestion.save();

    res.status(201).json({ message: "Question added successfully!", question: newQuestion });

  } catch (error) {
    console.error("Error adding question:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Import questions from CSV
// Import questions from CSV
exports.importQuestionsFromCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const filePath = req.file.path;
  const results = [];
  const errors = [];

  try {
    // CSV parsing
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({
          strict: false,
          skipLines: 0,
          trim: true,
          skipEmptyLines: true
        }))
        .on("data", (data) => {
          try {
            // Handle missing questionText and ensure it's unique
            let questionText = data.questionText && data.questionText.trim() !== '' 
              ? data.questionText.trim() 
              : "Generated Question Text " + Math.floor(Math.random() * 1000);

            const answers = [];
            let correctCount = 0;

            // Process answers (support up to 4 answers)
            for (let i = 1; i <= 4; i++) {
              const answerKey = `answer${i}`;
              const correctKey = `isCorrect${i}`;

              if (data[answerKey] && data[answerKey].trim() !== '') {
                const isCorrect = data[correctKey] 
                  ? data[correctKey].toString().toLowerCase() === "true" 
                  : false;

                if (isCorrect) correctCount++;

                answers.push({
                  text: data[answerKey].trim(),
                  isCorrect
                });
              } else {
                // If the answer is missing, add a random wrong answer
                answers.push({
                  text: generateRandomWrongAnswers(1)[0].text, // Random wrong answer
                  isCorrect: false
                });
              }
            }

            // Ensure exactly one correct answer
            if (correctCount === 0) {
              // Mark the first answer as correct if none are marked
              answers[0].isCorrect = true;
            } else if (correctCount > 1) {
              // If there are multiple correct answers, set all but one to false
              for (let i = 1; i < answers.length; i++) {
                if (answers[i].isCorrect) {
                  answers[i].isCorrect = false;
                  break;
                }
              }
            }

            // Ensure at least 2 answers
            if (answers.length < 2) {
              answers.push(...generateRandomWrongAnswers(2 - answers.length)); // Add random wrong answers if less than 2
            }

            results.push({
              questionText: questionText,
              answers
            });
          } catch (error) {
            errors.push(error.message);
          }
        })
        .on("end", () => resolve())
        .on("error", (error) => reject(error));
    });

    if (errors.length > 0) {
      throw new Error(`Errors in ${errors.length} rows: ${errors.join('; ')}`);
    }

    if (results.length === 0) {
      throw new Error("No valid questions found in file");
    }

    await Question.insertMany(results);
    fs.unlinkSync(filePath);

    res.status(200).json({ 
      message: `Imported ${results.length} questions successfully`,
      count: results.length,
      warnings: errors.length > 0 ? `${errors.length} rows had errors` : undefined
    });

  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(400).json({ 
      message: "Import failed",
      error: error.message,
      details: errors.length > 0 ? errors : undefined
    });
  }
};

// Other controller methods
exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.status(200).json(question);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const { questionText, answers } = req.body;
    
    // Validate exactly one correct answer
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    if (correctAnswers !== 1) {
      return res.status(400).json({ message: "Must have exactly one correct answer" });
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      { questionText, answers },
      { new: true }
    );
    
    if (!updatedQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }
    
    res.status(200).json({ 
      message: "Question updated successfully!", 
      question: updatedQuestion 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
    if (!deletedQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.status(200).json({ message: "Question deleted successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


