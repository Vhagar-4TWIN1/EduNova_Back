<<<<<<< HEAD
const express = require("express");
=======
const express = require('express');
const { createModule, getModules, updateModule, deleteModule,getModuleWithId } = require('../controllers/moduleController');

>>>>>>> fed8773005fb90fef6ed93423fe5792c4dcacda4
const router = express.Router();
const lessonController = require("../controllers/lessonController"); // ✅ Ajoutez cette ligne

<<<<<<< HEAD
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
=======
router.post('/add', createModule);
router.get('/', getModules);
router.get('/:id',getModuleWithId);
router.put('/:id', updateModule);
router.delete('/:id', deleteModule);
>>>>>>> fed8773005fb90fef6ed93423fe5792c4dcacda4

module.exports = router;
