// routers/userRouter.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  promoteToAdmin,
  updateStudentFields,
} = require("../controllers/userController");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadDir = "uploads/profiles"; // default

    if (file.fieldname === "workCertificate") {
      uploadDir = "uploads/certificates";
    } else if (file.fieldname === "diplomas") {
      uploadDir = "uploads/diplomas";
    } else if (file.mimetype.startsWith("image/")) {
      uploadDir = "uploads/profiles";
    }

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename with original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

// File filter to only allow certain image types
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image or PDF files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Middleware to verify token (identifier)
//const { identifier } = require('../middlewares/identification');

// Protect all routes below with the identifier middleware
//router.use(identifier);

// Profile image upload
router.post("/upload-profile", upload.single("profile"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    // Return the file path to be saved in the user's profile
    const filePath = req.file.path.replace(/\\/g, "/");
    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      filePath: filePath,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Read all users
router.get("/", getAllUsers);

// Read one user by ID
router.get("/:id", getUserById);

router.patch("/:id/student-fields", updateStudentFields);

// Update user
router.patch("/:id", updateUser);

// Custom endpoint for updating student fields
router.patch("/:id/teacher-fields", async (req, res) => {
  const { id } = req.params;
  const { number, bio, cv, diplomas, experience, cin, workCertificate } =
    req.body;

  try {
    console.log("Updating teacher fields for ID:", id);

    const { User } = require("../models/usersModel");

    // ✅ Use User.findById, not Teacher
    const user = await User.findById(id);
    if (!user || user.role !== "Teacher") {
      return res
        .status(404)
        .json({ message: "Teacher not found with this ID" });
    }

    const updateData = {};
    if (number !== undefined) updateData.number = number;
    if (bio !== undefined) updateData.bio = bio;
    if (cv !== undefined) updateData.cv = cv;
    if (diplomas !== undefined) updateData.diplomas = diplomas;
    if (experience !== undefined) updateData.experience = experience;
    if (cin !== undefined) updateData.cin = cin;
    if (workCertificate !== undefined)
      updateData.workCertificate = workCertificate;

    const updated = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating teacher fields:", error);
    return res.status(500).json({ message: error.message });
  }
});

// Custom endpoint for updating teacher fields
router.patch("/:id/teacher-fields", async (req, res) => {
  const { id } = req.params;
  const { number, bio, cv, diplomas, experience, cin, workCertificate } =
    req.body;

  try {
    console.log("Updating teacher fields for ID:", id);
    console.log("Teacher data received:", req.body);

    // Import the Teacher model
    const { Teacher } = require("../models/usersModel");

    // First check if the user is a teacher
    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found with this ID",
      });
    }

    // Build update object - only include fields that are provided
    const updateData = {};
    if (number !== undefined) updateData.number = number;
    if (bio !== undefined) updateData.bio = bio;
    if (cv !== undefined) updateData.cv = cv;
    if (diplomas !== undefined) updateData.diplomas = diplomas;
    if (experience !== undefined) updateData.experience = experience;
    if (cin !== undefined) updateData.cin = cin;
    if (workCertificate !== undefined)
      updateData.workCertificate = workCertificate;

    console.log("Updating with data:", updateData);

    // Update the teacher fields directly
    const updatedTeacher = await Teacher.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    console.log("Updated teacher:", updatedTeacher);

    res.status(200).json(updatedTeacher);
  } catch (error) {
    console.error("Error updating teacher fields:", error);
    res.status(500).json({ message: error.message });
  }
});

// Custom endpoint for updating admin fields
router.patch("/:id/admin-fields", async (req, res) => {
  const { id } = req.params;
  const { cin, number } = req.body;

  try {
    console.log("Updating admin fields for ID:", id);
    console.log("Admin data received:", req.body);

    // Import the Admin model
    const { Admin } = require("../models/usersModel");

    // First check if the user is an admin
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        message: "Admin not found with this ID",
      });
    }

    // Build update object - only include fields that are provided
    const updateData = {};
    if (cin !== undefined) updateData.cin = cin;
    if (number !== undefined) updateData.number = number;

    console.log("Updating with data:", updateData);

    // Update the admin fields directly
    const updatedAdmin = await Admin.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    console.log("Updated admin:", updatedAdmin);

    res.status(200).json(updatedAdmin);
  } catch (error) {
    console.error("Error updating admin fields:", error);
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/promote", promoteToAdmin);

// Delete user
router.delete("/:id", deleteUser);

router.post("/upload-diplomas", upload.array("diplomas", 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  const filePaths = req.files.map((file) => file.path.replace(/\\/g, "/"));
  res.status(200).json({ files: filePaths });
});

// Upload work certificate (single PDF)
router.post(
  "/upload-work-certificate",
  upload.single("workCertificate"),
  (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      const filePath = req.file.path.replace(/\\/g, "/");
      res.status(200).json({
        success: true,
        message: "Work certificate uploaded successfully",
        path: filePath, // 👈 this is what the frontend expects
      });
    } catch (error) {
      console.error("Work certificate upload error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.post("/delete-file", (req, res) => {
  const { filePath } = req.body;
  const fullPath = path.join(__dirname, "..", filePath);

  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return res.status(200).json({ success: true, message: "File deleted" });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }
  } catch (err) {
    console.error("❌ Error deleting file:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/delete-diploma", (req, res) => {
  const { filePath } = req.body;

  if (!filePath || !filePath.startsWith("uploads/diplomas/")) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid diploma path" });
  }

  const fullPath = path.join(__dirname, "..", filePath.replace(/\\/g, "/"));

  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return res
        .status(200)
        .json({ success: true, message: "Diploma deleted successfully" });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Diploma file not found" });
    }
  } catch (err) {
    console.error("Error deleting diploma:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error deleting diploma" });
  }
});
router.patch("/affectbadges/:idUser/:idBadge", async (req, res) => {
  const { idUser, idBadge } = req.params;
  const { Student } = require("../models/usersModel");
  const Badge = require("../models/badge"); // Import the Badge model

  try {
    const user = await Student.findById(idUser); // Use the Student model
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.achievedBadges) {
      user.achievedBadges = [];
    }
    const badgeExists = user.achievedBadges.some(
      (badgeId) => badgeId.toString() === idBadge
    );
    if (badgeExists) {
      return res.status(400).json({ message: "Badge already achieved" });
    }

    const badge = await Badge.findById(idBadge);
    if (!badge) {
      return res.status(404).json({ message: "Badge not found" });
    }

    user.achievedBadges.push(badge._id); // Adding badge to student's achieved badges
    await user.save();

    res.status(200).json({ message: "Badge assigned successfully", user });
  } catch (error) {
    console.error("Error assigning badge:", error);
    res.status(500).json({ message: error.message });
  }
});

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET); // Decode the token
    req.user = decoded; // Attach decoded data to the request object
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
// Get User's Badges
router.get("/badges/:userId", async (req, res) => {
  const { userId } = req.params;
  const { User } = require("../models/usersModel"); // Import the User model

  try {
    const user = await User.findById(userId).populate("achievedBadges");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found!" });
    }
    res.status(200).json(user.achievedBadges);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the badges.",
    });
  }
});
router.get("/unachieved-badges/:userId", async (req, res) => {
  const { userId } = req.params;
  const { User } = require("../models/usersModel");
  const Badge = require("../models/badge"); // Import the Badge model

  try {
    const user = await User.findById(userId).populate("achievedBadges");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found!" });
    }
    const unachievedBadges = await Badge.find({
      _id: { $nin: user.achievedBadges },
    });
    res.status(200).json(unachievedBadges);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the badges.",
    });
  }
});

// PATCH /api/users/fix-discriminator/teachers
router.patch("/fix-discriminator/teachers", async (req, res) => {
  try {
    const { User } = require("../models/usersModel");
    const result = await User.updateMany(
      { role: "Teacher", __t: { $exists: false } },
      { $set: { __t: "Teacher" } }
    );
    res.status(200).json({
      success: true,
      message: `✅ Updated ${result.modifiedCount} teacher(s) with missing __t`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
