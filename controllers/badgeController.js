const multer = require('multer');
const path = require('path');
const Badge = require('../models/badge');
const { validationResult } = require('express-validator');

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/badges/'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Initialize Multer
const upload = multer({ storage, fileFilter });

// ✅ Export `upload`
module.exports.upload = upload;

// ✅ Export functions
module.exports.createBadge = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        const { title, category, description, points } = req.body;
        const image = req.file ? req.file.filename : null;
        const badge = new Badge({ title, category, description, image, points });
        await badge.save();
        return res.status(201).json({ success: true, message: 'Badge created successfully', badge });
    } catch (error) {
        console.error('❌ Error creating badge:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports.getBadges = async (req, res) => {
    try {
        const badges = await Badge.find();
        return res.status(200).json({ success: true, badges });
    } catch (error) {
        console.error('❌ Error fetching badges:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
module.exports.getBadge = async (req, res) => {
    const { id } = req.params;
    try {
        const badge = await Badge.findById(id);
        if (!badge) {
            return res.status(404).json({ success: false, message: 'Badge not found' });
        }
        return res.status(200).json({ success: true, badge });
    } catch (error) {
        console.error('❌ Error fetching badge:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
module.exports.deleteBadge = async (req, res) => {
    const { id } = req.params;
    try {
        const badge = await Badge.findByIdAndDelete(id);
        if (!badge) {
            return res.status(404).json({ success: false, message: 'Badge not found' });
        }
        return res.status(200).json({ success: true, message: 'Badge deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting badge:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
module.exports.updateBadge = async (req, res) => {
    const { id } = req.params;
    try {
        const badge = await Badge.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!badge) {
            return res.status(404).json({ success: false, message: 'Badge not found' });
        }
        return res.status(200).json({ success: true, badge });
    }
    catch (error) {
        console.error('❌ Error updating badge:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}


// Other CRUD functions...
