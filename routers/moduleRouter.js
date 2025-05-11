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
} = require("../controllers/moduleController");
const { auth } = require("../middlewares/auth");

router.get("/", auth, getModules);
router.get("/modules/", auth, getModuleWithUserId);
router.post("/add", auth, createModule);
router.get("/:id", getModuleWithId);
router.put("/:id", auth, updateModule);
router.delete("/:id", auth, deleteModule);
router.get("/modules/:moduleId/lessons", lessonController.getLessonsByModule);
module.exports = router;
