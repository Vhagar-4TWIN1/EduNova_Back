"use strict";

const express = require('express');
const router = express.Router();
const {
  createBadge,
  getBadges,
  getBadge,
  updateBadge,
  deleteBadge,
  upload
} = require('../controllers/badgeController');
router.post('/', upload.single('image'), createBadge);
router.get('/', getBadges);
router.get('/:id', getBadge);
router.put('/:id', updateBadge);
router.delete('/:id', deleteBadge);
module.exports = router;