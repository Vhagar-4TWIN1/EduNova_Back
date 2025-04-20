const Joi = require('joi');

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().label('Current Password'),
  newPassword: Joi.string()
    .min(8)
    .required()
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .message('Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character')
    .label('New Password'),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match'
    })
    .label('Confirm Password')
});

module.exports = {
  changePasswordSchema
};