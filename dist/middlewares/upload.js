"use strict";

const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/lessons/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const fileFilter = (req, file, cb) => {
  console.log('📁 Received file:', file.originalname);
  console.log('📁 Received file type:', file.mimetype);
  const allowedTypes = ['application/pdf', 'video/mp4', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo', 'video/webm', 'application/octet-stream', 'text/plain', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'audio/mpeg', 'audio/wav'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.error('❌ Rejected file:', file.originalname, file.mimetype);
    cb(new Error('Invalid file type'), false);
  }
};
module.exports = multer({
  storage,
  fileFilter
});