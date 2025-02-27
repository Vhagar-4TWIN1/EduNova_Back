const Joi = require('joi');

exports.signupSchema = Joi.object({
<<<<<<< HEAD

	firstName: Joi.string().min(2).max(50).required(),

	lastName: Joi.string().min(2).max(50).required(),
    age: Joi.number().min(18),

	country: Joi.string(),
    photo: Joi.string().optional(),
	
=======
>>>>>>> user-crud
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
