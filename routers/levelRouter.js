const express = require('express');
const router = express.Router();
const levelController = require('../controllers/levelController');

// CREATE a new Level
router.post('/', levelController.createLevel);

// READ all Levels
router.get('/', levelController.getAllLevels);

// READ a single Level by id
router.get('/:id', levelController.getLevelById);

// UPDATE a Level
router.put('/:id', levelController.updateLevel);

// DELETE a Level
router.delete('/:id', levelController.deleteLevel);

module.exports = router;