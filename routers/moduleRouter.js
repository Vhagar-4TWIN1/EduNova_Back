const express = require('express');
const { createModule, getModules, updateModule, deleteModule,getModuleWithId } = require('../controllers/moduleController');

const router = express.Router();

router.post('/add', createModule);
router.get('/', getModules);
router.get('/:id',getModuleWithId);
router.put('/:id', updateModule);
router.delete('/:id', deleteModule);

module.exports = router;
