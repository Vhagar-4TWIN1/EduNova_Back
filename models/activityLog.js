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
			enum: ['LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'SIGNUP'],
		},
		ipAddress: {
			type: String,
			required: true,
		},
		userAgent: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
