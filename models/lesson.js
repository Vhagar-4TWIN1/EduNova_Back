const mongoose = require("mongoose");

const annotationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  highlights: [{ text: String, color: String }],
  notes: [{ content: String, createdAt: { type: Date, default: Date.now } }],
});

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    typeLesson: {
      type: String,
      enum: ["pdf", "video", "photo", "audio"],
      required: true,
    },
    fileUrl: { type: String, required: true },
    public_id: { type: String },
    LMScontent: { type: String },
    module: { type: mongoose.Schema.Types.ObjectId, ref: "Module" },
    annotations: [annotationSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lesson", lessonSchema);
