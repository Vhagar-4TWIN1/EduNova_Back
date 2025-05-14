"use strict";

const VideoCall = require('../models/videoCall');
const User = require('../models/usersModel');
const mongoose = require('mongoose');
exports.createVideoCall = async (req, res) => {
  const {
    participants
  } = req.body;
  try {
    const videoCall = new VideoCall({
      participants
    });
    await videoCall.save();
    res.status(201).json(videoCall);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};
exports.getVideoCall = async (req, res) => {
  const {
    id
  } = req.params;
  try {
    const videoCall = await VideoCall.findById(id).populate('participants', 'username');
    if (!videoCall) return res.status(404).json({
      message: 'Video call not found'
    });
    res.json(videoCall);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};
exports.getAllVideoCalls = async (req, res) => {
  try {
    const videoCalls = await VideoCall.find().populate('participants', 'username').sort({
      createdAt: -1
    });
    res.json(videoCalls);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};
exports.deleteVideoCall = async (req, res) => {
  const {
    id
  } = req.params;
  try {
    const videoCall = await VideoCall.findByIdAndDelete(id);
    if (!videoCall) return res.status(404).json({
      message: 'Video call not found'
    });
    res.json({
      message: 'Video call deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};
exports.updateVideoCall = async (req, res) => {
  const {
    id
  } = req.params;
  const {
    participants
  } = req.body;
  try {
    const videoCall = await VideoCall.findByIdAndUpdate(id, {
      participants
    }, {
      new: true
    });
    if (!videoCall) return res.status(404).json({
      message: 'Video call not found'
    });
    res.json(videoCall);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};
exports.addParticipant = async (req, res) => {
  const {
    id
  } = req.params;
  const {
    userId
  } = req.body;
  try {
    const videoCall = await VideoCall.findById(id);
    if (!videoCall) return res.status(404).json({
      message: 'Video call not found'
    });
    if (videoCall.participants.includes(userId)) return res.status(400).json({
      message: 'User already in video call'
    });
    videoCall.participants.push(userId);
    await videoCall.save();
    res.json(videoCall);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};