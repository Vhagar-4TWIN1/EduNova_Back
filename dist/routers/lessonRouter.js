"use strict";

const express = require("express");
const router = express.Router();
const lessonController = require("../controllers/lessonController");
const {
  getLessonAudio
} = require("../controllers/lessonController");
const {
  lessonValidation
} = require("../middlewares/validator");
const upload = require("../middlewares/upload");
const passport = require("../middlewares/passport");
const authenticate = passport.authenticateJWT;
const {
  generateAIAnnotations
} = require("../controllers/annotationController");
const isTeacher = (req, res, next) => {
  if (req.user.role === 'teacher') {
    return next();
  }
  return res.status(403).json({
    message: "Access denied. Teacher role required."
  });
};

// ✅ Accepts JSON body from frontend (because the file is already uploaded to Cloudinary)
router.get('/:id/track', authenticate, lessonController.trackLessonView);
router.get("/", authenticate, lessonController.getAllLessons);
router.get("/:id", authenticate, lessonController.getLessonById);
router.patch("/:id", authenticate, upload.single("file"), lessonValidation, lessonController.updateLesson);
router.get('/source/google', authenticate, lessonController.getGoogleLessons);
router.post('/', authenticate, lessonValidation, upload.single("file"), lessonController.createLesson);
router.get('/', authenticate, lessonController.getAllLessons);
router.get('/source/google', authenticate, lessonController.getGoogleLessons);
router.get('/:id', authenticate, lessonController.getLessonById);
router.patch('/:id', authenticate, upload.single('file'), lessonValidation, lessonController.updateLesson);
router.delete('/:id', authenticate, lessonController.deleteLesson);
router.get('/:id/tts', authenticate, lessonController.getLessonAudio);
router.post('/:id/annotation', authenticate, lessonController.addAnnotation);
router.post('/:id/generate-ai-annotations', authenticate, generateAIAnnotations);
router.get('/:id/audio', authenticate, lessonController.getLessonAudio);
router.get('/module/:moduleId', authenticate, lessonController.getLessonsByModule);
module.exports = router;