const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
<<<<<<< HEAD
  {
    email: {
      type: String,
      required: [true, "Email is required!"],
      trim: true,
      unique: [true, "Email must be unique!"],
      minLength: [5, "Email must have 5 characters!"],
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password must be provided!"],
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

    // Twitter specific fields
    twitterId: {
      type: String,
      unique: true, // Ensure uniqueness for Twitter ID
    },
    username: {
      type: String,
    },
    avatarUrl: {
      type: String,
    },
    role: {
      type: String,
      default: "etudiant",
    },
  },
  {
    timestamps: true,
  }
=======
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
>>>>>>> bc19e4d27be111f7932fd839a0e584dddd50aab8
);

module.exports = mongoose.model("User", userSchema);
