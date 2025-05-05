const VideCallController = require('../controllers/videCallController');   
const express = require('express');
const router = express.Router();
const VideoCall = require('../models/videoCall');
const User = require('../models/user');
const mongoose = require('mongoose');
router.post('/', VideCallController.createVideoCall); // Create a new video call
router.get('/:id', VideCallController.getVideoCall); // Get a specific video call by ID
router.get('/', VideCallController.getAllVideoCalls); // Get all video calls
router.delete('/:id', VideCallController.deleteVideoCall); // Delete a specific video call by ID
router.put('/:id', VideCallController.updateVideoCall); // Update a specific video call by ID