const mongoose = require('mongoose');

const activityLogSchema = mongoose.Schema(
	{
	  userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	  },
	  email: { 
		type: String,
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
	  duration: {
		type: Number, // Durée en millisecondes
		default: 0,
	  },
	},
	{
	  timestamps: true,
	}
  );
module.exports = mongoose.model('ActivityLog', activityLogSchema);
