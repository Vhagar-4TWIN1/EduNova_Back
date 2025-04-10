<<<<<<< HEAD
const express = require('express');
const { createModule, getModules, updateModule, deleteModule,getModuleWithId } = require('../controllers/moduleController');

const router = express.Router();

router.post('/add', createModule);
router.get('/', getModules);
router.get('/:id',getModuleWithId);
router.put('/:id', updateModule);
router.delete('/:id', deleteModule);
=======
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
>>>>>>> origin/main

module.exports = router;
