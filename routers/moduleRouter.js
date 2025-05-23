const express = require("express");
const router = express.Router();

const lessonController = require("../controllers/lessonController"); // ✅ Ajoutez cette ligne

const {
  createModule,
  getModules,
  updateModule,
  deleteModule,
  getModuleWithId,
  getModuleWithUserId,
  trackLessonDuration
} = require("../controllers/moduleController");
const { auth } = require("../middlewares/auth");
router.get("/modules/",auth, getModuleWithUserId)

router.get("/:id",auth, getModuleWithId); 
router.post("/check-lessons-duration", auth, trackLessonDuration);
router.post("/add",auth, createModule);
router.get("/",auth, getModules);
router.put("/:id", auth ,updateModule);
router.delete("/:id",auth, deleteModule);
router.get("/modules/:moduleId/lessons",auth, lessonController.getLessonsByModule);
module.exports = router;
