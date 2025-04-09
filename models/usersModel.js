 const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    //   idUser: { type: String, unique: true, required: true },
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    age: { type: Number, required: false },
	provider: { type: String, required: false },  //facebook 
    email: { type: String, required: true, unique: true },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
      select: false,
    },
    verificationCodeValidation: {
      type: Number,
      select: false,
    },
    forgotPasswordCode: {
      type: String,
      select: false,
    },
    forgotPasswordCodeValidation: {
      type: Number,
      select: false,
    },
    password: { type: String, required: false },
    country: { type: String, required: false },
    role: {
      type: String,
      required: false,
      enum: ["Admin", "Teacher", "Student"],
    },
    photo: { type: String }, // User profile photo path
  },
  { discriminatorKey: "role", timestamps: true }
);

const User = mongoose.model("User", userSchema);

// Admin Schema (Extends User)
const adminSchema = new mongoose.Schema({
  cin: { type: String, unique: true, sparse: true },
  number: { type: String },
});
const Admin = User.discriminator("Admin", adminSchema);

// Teacher Schema (Extends User)
const teacherSchema = new mongoose.Schema({
  number: { type: String },
  bio: { type: String },
  cv: { type: String },
  diplomas: [{ type: String }],
  experience: { type: String },
  cin: { type: String, unique: true, sparse: true },
  workCertificate: { type: String },
  diplomas: [{ type: String }],
});
const Teacher = User.discriminator("Teacher", teacherSchema);

// Student Schema (Extends User)
const studentSchema = new mongoose.Schema({
  identifier: { type: String, unique: true, sparse: true },
  situation: { type: String },
  disease: { type: String },
  socialCase: { type: Boolean, default: false },
  learningPreference: {
    type: String,
    enum: ["video", "pdf"],
    default: "video",
  },
  interests: [{ type: String }],
});
const Student = User.discriminator("Student", studentSchema);
module.exports = { User, Admin, Teacher, Student };

module.exports = { User, Admin, Teacher, Student };
