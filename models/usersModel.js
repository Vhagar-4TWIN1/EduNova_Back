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
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('User', userSchema);
*/

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	age: { type: Number, required: true },
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true }, // Mot de passe obligatoire
	country: { type: String, required: true },
	photo: { type: String },
	
	verified: { type: Boolean, default: false },
  });

const User = mongoose.model("User", userSchema);
module.exports = User;