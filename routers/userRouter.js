// routers/userRouter.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
	getAllUsers,
	getUserById,
	updateUser,
	deleteUser,
} = require('../controllers/userController');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/profiles';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Create a unique filename with original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

// File filter to only allow certain image types
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    }
});

// Middleware to verify token (identifier)
//const { identifier } = require('../middlewares/identification');

// Protect all routes below with the identifier middleware
//router.use(identifier);

// Profile image upload
router.post('/upload-profile', upload.single('profile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        
        // Return the file path to be saved in the user's profile
        const filePath = req.file.path.replace(/\\/g, '/');
        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            filePath: filePath
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Read all users
router.get('/', getAllUsers);

// Read one user by ID
router.get('/:id', getUserById);

// Update user
router.patch('/:id', updateUser);

// Custom endpoint for updating student fields
router.patch('/:id/student-fields', async (req, res) => {
    const { id } = req.params;
    const { identifier, situation, disease, socialCase } = req.body;
    
    try {
        console.log("Updating student fields for ID:", id);
        console.log("Student data received:", req.body);
        
        // Import the Student model - make sure this is properly imported
        const { Student } = require('../models/usersModel');
        
        // First check if the user is a student
        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).json({ 
                message: 'Student not found with this ID' 
            });
        }
        
        // Build update object - only include fields that are provided
        const updateData = {};
        if (identifier !== undefined) updateData.identifier = identifier;
        if (situation !== undefined) updateData.situation = situation;
        if (disease !== undefined) updateData.disease = disease;
        if (socialCase !== undefined) updateData.socialCase = socialCase;
        
        console.log("Updating with data:", updateData);
        
        // Update the student fields directly
        const updatedStudent = await Student.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );
        
        console.log("Updated student:", updatedStudent);
        
        res.status(200).json(updatedStudent);
    } catch (error) {
        console.error("Error updating student fields:", error);
        res.status(500).json({ message: error.message });
    }
});

// Delete user
router.delete('/:id', deleteUser);

module.exports = router;
