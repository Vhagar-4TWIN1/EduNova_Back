const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/lessons/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'video/mp4', 'image/jpeg', 'image/png'];
  allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'), false);
};

module.exports = multer({ storage, fileFilter });
