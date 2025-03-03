// controllers/userController.js
const User = require("../models/usersModel");

/**
 * GET ALL USERS
 * Fetch all users, omitting the password field
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Omit the password field from the result
    const users = await User.find().select("-password");
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching users.",
    });
  }
};

/**
 * GET USER BY ID
 * Fetch a single user by their ID
 */
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found!" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the user.",
    });
  }
};

/**
 * UPDATE USER
 * Update user information (excluding password changes, which is handled separately)
 */
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  // We assume the body contains the updatable fields, e.g. "verified", or perhaps "email"
  const updates = req.body;

  try {
    // If password is included, you might decide to ignore or handle it here.
    // For security, let's remove 'password' from updates if present:
    if (updates.password) {
      delete updates.password;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found!" });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully!",
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the user.",
    });
  }
};

/**
 * DELETE USER
 * Remove a user from the database
 */
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found!" });
    }
    res.status(200).json({
      success: true,
      message: "User deleted successfully!",
      data: deletedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the user.",
    });
  }
};
