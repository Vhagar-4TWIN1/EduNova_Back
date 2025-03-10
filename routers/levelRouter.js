const express = require('express');
const router = express.Router();
const levelController = require('../controllers/levelController');

// CREATE a new Level
router.post('/levels', levelController.createLevel);

// READ all Levels
router.get('/levels', levelController.getAllLevels);

// READ a single Level by id
router.get('/levels/:id', levelController.getLevelById);

// UPDATE a Level
router.put('/levels/:id', levelController.updateLevel);

// DELETE a Level
router.delete('/levels/:id', levelController.deleteLevel);

module.exports = router;
