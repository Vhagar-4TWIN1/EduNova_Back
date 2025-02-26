const express = require('express');
const { createModule, getModules, updateModule, deleteModule } = require('../controllers/moduleController');

const router = express.Router();

router.post('/add', createModule);
router.get('/', getModules);
router.put('/:id', updateModule);
router.delete('/:id', deleteModule);

module.exports = router;
