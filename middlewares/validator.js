const Joi = require('joi');

exports.signupSchema = Joi.object({
	firstName: Joi.string().min(2).max(50).required(),
	lastName: Joi.string().min(2).max(50).required(),
	age: Joi.number().min(18),
	country: Joi.string().required(),
	photo: Joi.string().optional(),

	email: Joi.string()
		.min(6)
		.max(60)
		.required()
		.email({ tlds: { allow: ['com', 'net', 'tn'] } }),

	password: Joi.string()
		.required()
		.pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$')),

	role: Joi.string().valid('Admin', 'Teacher', 'Student').required(),

	// Optional fields per role
	cin: Joi.string().optional(),
	number: Joi.string().optional(),

	bio: Joi.string().optional(),
	cv: Joi.string().optional(),
	diplomas: Joi.array().items(Joi.string()).optional(),
	experience: Joi.string().optional(),

	identifier: Joi.string().optional(),
	situation: Joi.string().optional(),
	disease: Joi.string().optional(),
	socialCase: Joi.boolean().optional()
});

exports.signinSchema = Joi.object({
	email: Joi.string()
		.min(6)
		.max(60)
		.required()
		.email({
			tlds: { allow: ['com', 'net', 'tn'] },
		}),
	password: Joi.string()
		.required()
		.pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$')),
});

exports.acceptCodeSchema = Joi.object({
	email: Joi.string()
		.min(6)
		.max(60)
		.required()
		.email({
			tlds: { allow: ['com', 'net', 'tn'] },
		}),
	providedCode: Joi.number().required(),
});

exports.changePasswordSchema = Joi.object({
	newPassword: Joi.string()
		.required()
		.pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$')),
	oldPassword: Joi.string()
		.required()
		.pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$')),
});

exports.acceptFPCodeSchema = Joi.object({
	email: Joi.string()
		.min(6)
		.max(60)
		.required()
		.email({
			tlds: { allow: ['com', 'net', 'tn'] },
		}),
	providedCode: Joi.number().required(),
	newPassword: Joi.string()
		.required()
		.pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$')),
	
});
exports.lessonValidation = [ /* array of express-validator rules */ ];

