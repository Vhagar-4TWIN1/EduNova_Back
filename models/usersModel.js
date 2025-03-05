/*const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
	{
		nom: {
			type: String,
			required: [true, 'Nom is required!'],
			trim: true,
			minLength: [2, 'Nom must have at least 2 characters!'],
		},
		
		email: {
			type: String,
			required: [true, 'Email is required!'],
			trim: true,
			unique: [true, 'Email must be unique!'],
			minLength: [5, 'Email must have 5 characters!'],
			lowercase: true,
		},
		password: {
			type: String,
			required: [true, 'Password must be provided!'],
			trim: true,
			select: false,
		},
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
		country: { type: String, required: true },
		photo: { type: String },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('User', userSchema);
  */
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
	{
	  firstName: { type: String, required: false },
	  lastName: { type: String, required: false },
	  age: { type: Number, required: false },
	  email: { type: String, required: false, unique: true },
	  password: { type: String, required: false },
	  country: { type: String, required: false },
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
	  role: { type: String, required: false, enum: ["Admin", "Teacher", "Student"] },
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
  });
  const Teacher = User.discriminator("Teacher", teacherSchema);
  
  // Student Schema (Extends User)
  const studentSchema = new mongoose.Schema({
	identifier: { type: String, unique: true, sparse: true },
	situation: { type: String },
	disease: { type: String },
	socialCase: { type: Boolean, default: false },
  });
  const Student = User.discriminator("Student", studentSchema);
  
  module.exports = { User, Admin, Teacher, Student };
  
