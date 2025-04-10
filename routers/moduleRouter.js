const express = require("express");
const router = express.Router();
const lessonController = require("../controllers/lessonController"); // ✅ Ajoutez cette ligne

const {
  createModule,
  getModules,
  updateModule,
  deleteModule,
  getModuleWithId,
} = require("../controllers/moduleController");
router.get("/:id", getModuleWithId); // ⬅️ ajoute cette route avant les routes plus générales

router.post("/add", createModule);
router.get("/", getModules);
router.put("/:id", updateModule);
router.delete("/:id", deleteModule);
router.get("/modules/:moduleId/lessons", lessonController.getLessonsByModule);

module.exports = router;
