const bcrypt = require('bcrypt');
const {User} = require('../models/usersModel');
const ActivityLog = require('../models/activityLog');
const { transport2 } = require('../middlewares/sendMail');

// Password validation function
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Main change password function
const changePassword = async (req, res) => {
  const { userId , email } = req.user;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    // Input validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password and confirmation are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match'
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number and special character'
      });
    }
    console.log(req.user);
    // Check if user is verified
    
    // Get user from database
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is different
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Log the activity
    await ActivityLog.create({
      userId,
      email,
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      action: 'PASSWORD_CHANGE'
    });

    // Send notification email
    await sendPasswordChangeEmail(email);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during password change',
      error: error.message
    });
  }
};

// Helper function to send email notification
const sendPasswordChangeEmail = async (email) => {
  try {
    await transport2.sendMail({
      from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS_2,
      to: email,
      subject: 'Your Password Has Been Changed',
      html: `
        <p>Your password was successfully changed.</p>
        <p>If you didn't make this change, please contact our support team immediately.</p>
        <p>Thank you,</p>
        <p>Your Application Team</p>
      `
    });
  } catch (emailError) {
    console.error('Failed to send password change email:', emailError);
    // We don't throw error here as password change was successful
  }
};

module.exports = {
  changePassword
};