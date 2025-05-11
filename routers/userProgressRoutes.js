const express = require("express");
const router = express.Router();
const userProgressController = require("../controllers/userProgressController");

router.post("/enroll", userProgressController.enrollInModule);
router.get("/enrollment/:userId/:moduleId", userProgressController.checkEnrollment);
router.get("/completed/:userId/:moduleId", userProgressController.getCompletedLessons);
router.get("/user/:userId", userProgressController.getAllProgressByUser);

router.post("/complete", userProgressController.markLessonCompleted);
router.post('/complete/lesson', userProgressController.markLessonCompletedForEvent);
router.patch("/complete/event", userProgressController.markEventCompleted);

module.exports = router;
