const express = require('express');
const { getAllUsers, updateUser, deleteUser } = require('../controllers/userBackController');

const router = express.Router();

router.get('/', getAllUsers);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
