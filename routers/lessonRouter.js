const express = require("express");
const router = express.Router();
const lessonController = require("../controllers/lessonController");
const { getLessonAudio } = require("../controllers/lessonController");
const { lessonValidation } = require("../middlewares/validator");
const upload = require("../middlewares/upload");
const passport = require("../middlewares/passport");
const authenticate = passport.authenticateJWT;

// ✅ Accepts JSON body from frontend (because the file is already uploaded to Cloudinary)
router.post("/", authenticate, lessonValidation, lessonController.createLesson);
router.get("/", authenticate, lessonController.getAllLessons);
router.get("/:id", authenticate, lessonController.getLessonById);
router.patch(
  "/:id",
  authenticate,
  upload.single("file"),
  lessonValidation,
  lessonController.updateLesson
);
router.delete("/:id", authenticate, lessonController.deleteLesson);
router.get("/:id/tts", authenticate, lessonController.getLessonAudio);
router.post("/:id/annotation", authenticate, lessonController.addAnnotation);
router.get("/:id/audio", authenticate, lessonController.getLessonAudio);

module.exports = router;
