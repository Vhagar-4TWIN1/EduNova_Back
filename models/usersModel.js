const mongoose = require('mongoose');

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
