const { User } = require("../models/usersModel");
const { Student } = require("../models/usersModel");
const ActivityLog = require('../models/activityLog');

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Badge = require("../models/badge");// 
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select("-password")
      .skip(skip)
      .limit(limit)
      .lean(); // Include all fields, including role and __t

    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      users,
      totalPages,
      currentPage: page,
      totalUsers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    // If there's a new photo and an old one exists, delete the old photo
    if (updateData.photo) {
      const currentUser = await User.findById(id);
      if (
        currentUser &&
        currentUser.photo &&
        currentUser.photo !== updateData.photo
      ) {
        try {
          const oldPhotoPath = path.join(__dirname, "..", currentUser.photo);
          if (fs.existsSync(oldPhotoPath)) {
            fs.unlinkSync(oldPhotoPath);
            console.log(`Old profile image deleted: ${oldPhotoPath}`);
          }
        } catch (err) {
          console.error("Error deleting old profile image:", err);
          // Continue with the update even if deleting fails
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

// Delete user
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user's profile photo if it exists
    if (user.photo) {
      try {
        const photoPath = path.join(__dirname, "..", user.photo);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
          console.log(`Profile image deleted: ${photoPath}`);
        }
      } catch (err) {
        console.error("Error deleting profile image:", err);
        // Continue with deletion even if image deletion fails
      }
    }

    const deletedUser = await User.findByIdAndDelete(id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.promoteToAdmin = async (req, res) => {
  const { id } = req.params;
  console.log("➡️ promoteToAdmin called with ID:", id);

  try {
    // Use native MongoDB update to bypass Mongoose discriminator
    const result = await mongoose.connection
      .collection("users")
      .findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: { role: "Admin", __t: "Admin" } }, // <-- important: update __t too!
        { returnDocument: "after" }
      );

    if (!result.value) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ Forced promotion result:", result.value);
    return res.status(200).json({
      message: "User forcibly promoted to Admin",
      user: result.value,
    });
  } catch (error) {
    console.error("❌ Error forcing promote:", error.stack);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateStudentFields = async (req, res) => {
  const { id } = req.params;
  const {
    identifier,
    situation,
    disease,
    customDisease,
    socialCase,
    learningPreference,
    interests,
  } = req.body;

  console.log("🔍 ID received:", id);
  console.log("🧾 Incoming data:", req.body);

  try {
    const update = {};

    if (identifier !== undefined) update.identifier = identifier;
    if (situation !== undefined) update.situation = situation;
    if (disease !== undefined) {
      update.disease = disease === "Other" ? customDisease : disease;
      update.customDisease = disease === "Other" ? customDisease : "";
    }
    if (socialCase !== undefined) update.socialCase = socialCase === true || socialCase === "on";
    if (learningPreference !== undefined) update.learningPreference = learningPreference;
    if (Array.isArray(interests)) update.interests = interests;

    console.log("🧱 Update object to apply:", update);

    const updatedStudent = await Student.findByIdAndUpdate(id, update, {
  new: true,
  runValidators: true,
}).select("-password");

if (!updatedStudent) {
  console.log("❌ Student not found with ID:", id);
  return res.status(404).json({ message: "Student not found" });
}

console.log("✅ Student updated:", updatedStudent);

res.status(200).json({
  message: "Student fields updated successfully",
  data: updatedStudent,
});
  }
  catch (error) {
    console.error("❌ Error updating student fields:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


/*
exports.updateStudentFields = async (req, res) => {
  const { id } = req.params;
  const {
    identifier,
    situation,
    disease,
    socialCase,
    learningPreference,
    interests,
    customDisease,
  } = req.body;

  try {
    const update = {
      identifier,
      situation,
      disease: disease === "Other" ? customDisease : disease,
      socialCase,
      learningPreference,
      interests,
    };

    const updatedUser = await User.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res
      .status(200)
      .json({ message: "Student fields updated", data: updatedUser });
  } catch (error) {
    console.error("Error updating student fields:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


*/
exports.affectBadge = async (req, res) => {
  const { studentId, badgeId } = req.body;
  try {
    const badge = await Badge.findById(badgeId);
    if (!badge) {
      return res
        .status(404)
        .json({ success: false, message: "Badge not found" });
    }
    const student = await Student.findByIdAndUpdate(
      studentId,
      { $addToSet: { achievedBadges: badgeId } }, // prevents duplicates
      { new: true }
    ).populate("achievedBadges");
    return res
      .status(200)
      .json({ success: true, message: "Badge affected successfully" });
  } catch (error) {
    console.error("❌ Error affecting badge:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
const BADGE_RULES = [
  {
    action: 'CHECK_MODULE',
    count: 10,
    title: 'Explorateur de modules',
  },
  {
    action: 'CHECK_LESSON',
    count: 10,
    title: 'Lecteur assidu',
  },
  {
    action: 'START_EVALUATION',
    count: 5,
    title: 'Aventurier des quiz',
  },
  {
    action: 'LOGIN',
    count: 6,
    title: 'Loyal User',
  },
  {
    action: 'FORUM',
    count: 1, 
    title: 'Forum Expert',
  },
  {
    action: 'REPLY_FORUM',
    count: 4, 
    title: 'Community Helper',
  },

];
exports.evaluateAndAssignBadges = async (userId) => {
  try {
    const stats = await ActivityLog.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
    ]);

    const badgeIdsToAssign = [];

    for (const rule of BADGE_RULES) {
      const actionStat = stats.find((s) => s._id === rule.action);
      if (actionStat && actionStat.count >= rule.count) {
        const badge = await Badge.findOne({ title: rule.title });
        if (badge) {
          badgeIdsToAssign.push(badge._id);
        }
      }
    }

    const student = await Student.findById(userId);
    const newBadges = badgeIdsToAssign.filter(
      (badgeId) => !student.achievedBadges.includes(badgeId)
    );

    if (newBadges.length > 0) {
      await Student.updateOne(
        { _id: userId },
        { $addToSet: { achievedBadges: { $each: newBadges } } }
      );
    }

    return { assigned: newBadges.length, userId };
  } catch (err) {
    console.error("Erreur assignation badge:", err);
  }
};


module.exports = {
  getAllUsers: exports.getAllUsers,
  getUserById: exports.getUserById,
  updateUser: exports.updateUser,
  deleteUser: exports.deleteUser,
  promoteToAdmin: exports.promoteToAdmin,
  affectBadge: exports.affectBadge,
  updateStudentFields: exports.updateStudentFields,
  evaluateAndAssignBadges : exports.evaluateAndAssignBadges
};
