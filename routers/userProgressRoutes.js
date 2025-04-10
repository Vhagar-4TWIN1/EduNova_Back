const express = require("express");
const router = express.Router();
const userProgressController = require("../controllers/userProgressController");

router.post("/enroll", userProgressController.enrollInModule);
router.get("/enrollment/:userId/:moduleId", userProgressController.checkEnrollment);
router.get("/completed/:userId/:moduleId", userProgressController.getCompletedLessons);
router.post("/complete", userProgressController.markLessonCompleted);

module.exports = router;
