const mongoose = require('mongoose');

const activityLogSchema = mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		action: {
			type: String,
			required: true,
enum: [
        'LOGIN',
        'LOGOUT',
        'PASSWORD_CHANGE',
        'SIGNUP',
        'CHECK_MODULE',
        'CHECK_LESSON',
        'WATCH_MUSIC',
        'VIDEO_CALL',
        'START_EVALUATION',
        'SUBMIT_EVALUATION',
		'CHECK_CALENDAR',
		'FORUM'
      ],		},
		ipAddress: {
			type: String,
			required: true,
		},
		userAgent: {
			type: String,
			required: true,
		},
		duration: { // Ajoutez ce champ
      type: Number,
      default: 0,
    },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
